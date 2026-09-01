import type { Hono } from '../hono'
import type { FormValue, ValidationTargets } from '../types'
import { serialize } from '../utils/cookie'
import type { UnionToIntersection } from '../utils/types'
import type { BuildSearchParamsFn, Callback, Client, ClientRequestOptions } from './types'
import {
  buildSearchParams,
  deepMerge,
  mergePath,
  removeIndexString,
  replaceUrlParam,
  replaceUrlProtocol,
} from './utils'

const createProxy = (callback: Callback, path: string[]) => {
  const proxy: unknown = new Proxy(() => {}, {
    get(_obj, key) {
      if (typeof key !== 'string' || key === 'then') {
        return undefined
      }
      return createProxy(callback, [...path, key])
    },
    apply(_1, _2, args) {
      return callback({
        path,
        args,
      })
    },
  })
  return proxy
}

const appendQueryParams = (url: string, searchParams: URLSearchParams): string => {
  const queryString = searchParams.toString()
  return queryString ? `${url}?${queryString}` : url
}

class ClientRequestImpl {
  private url: string
  private method: string
  private buildSearchParams: BuildSearchParamsFn
  private queryParams: URLSearchParams | undefined = undefined
  private pathParams: Record<string, string> = {}
  private rBody: BodyInit | undefined
  private cType: string | undefined = undefined

  constructor(
    url: string,
    method: string,
    options: {
      buildSearchParams: BuildSearchParamsFn
    }
  ) {
    this.url = url
    this.method = method
    this.buildSearchParams = options.buildSearchParams
  }

  private parseFormArgs(
    args: (ValidationTargets<FormValue> & { param?: Record<string, string> }) | undefined
  ): void {
    if (args.form) {
      const form = new FormData()
      for (const [k, v] of Object.entries(args.form)) {
        if (v === undefined) {
          continue
        }
        if (Array.isArray(v)) {
          for (const v2 of v) {
            if (v2 === undefined) {
              continue
            }
            form.append(k, v2)
          }
        } else {
          form.append(k, v)
        }
      }
      this.rBody = form
    }
  }

  private parseArgs(
    args: (ValidationTargets<FormValue> & { param?: Record<string, string> }) | undefined
  ): void {
    if (!args) {
      return
    }

    if (args.query) {
      this.queryParams = this.buildSearchParams(args.query)
    }

    this.parseFormArgs(args)

    if (args.json !== undefined) {
      this.rBody = JSON.stringify(args.json)
      this.cType = 'application/json'
    }

    if (args.param) {
      this.pathParams = args.param
    }
  }

  private async buildHeaders(
    args: (ValidationTargets<FormValue> & { param?: Record<string, string> }) | undefined,
    opt: ClientRequestOptions | undefined
  ): Promise<Headers> {
    const headerValues: Record<string, string | undefined> = {
      ...args?.header,
      ...(typeof opt?.headers === 'function' ? await opt.headers() : opt?.headers),
    }

    if (args?.cookie) {
      const cookies: string[] = []
      for (const [key, value] of Object.entries(args.cookie)) {
        if (value === undefined) {
          continue
        }
        cookies.push(serialize(key, value))
      }
      if (cookies.length > 0) {
        headerValues['Cookie'] = cookies.join('; ')
      }
    }

    if (this.cType) {
      headerValues['Content-Type'] = this.cType
    }

    const headers = new Headers()
    for (const [key, value] of Object.entries(headerValues)) {
      if (value !== undefined) {
        headers.set(key, value)
      }
    }
    return headers
  }

  private buildUrl(): string {
    let url = this.url
    url = removeIndexString(url)
    url = replaceUrlParam(url, this.pathParams)
    if (this.queryParams) {
      url = appendQueryParams(url, this.queryParams)
    }
    return url
  }

  fetch = async (
    args?: ValidationTargets<FormValue> & {
      param?: Record<string, string>
    },
    opt?: ClientRequestOptions
  ) => {
    this.parseArgs(args)

    const headers = await this.buildHeaders(args, opt)
    const url = this.buildUrl()

    const methodUpperCase = this.method.toUpperCase()
    const setBody = !(methodUpperCase === 'GET' || methodUpperCase === 'HEAD')

    // Pass URL string to 1st arg for testing with MSW and node-fetch
    return (opt?.fetch || fetch)(url, {
      body: setBody ? this.rBody : undefined,
      method: methodUpperCase,
      headers: headers,
      ...opt?.init,
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProxyCallbackArgs = Callback extends (opts: infer O) => unknown ? O : never
type ClientArgs = ValidationTargets<FormValue> & { param?: Record<string, string> }

type SpecialProxyResult = { handled: true; value: unknown } | { handled: false }

/**
 * Handles calling `.toString()` and `.valueOf()` on the proxy so it behaves like a
 * normal value (string / function). Returns `{ handled: true, value }` when a special
 * method matched, otherwise `{ handled: false }`.
 */
const handleSpecialProxyMethods = (
  lastParts: string[],
  proxyCallback: Callback
): SpecialProxyResult => {
  if (lastParts[0] === 'toString') {
    if (lastParts[1] === 'name') {
      // e.g. hc().somePath.name.toString() -> "somePath"
      return { handled: true, value: lastParts[2] || '' }
    }
    // e.g. hc().somePath.toString()
    return { handled: true, value: proxyCallback.toString() }
  }

  if (lastParts[0] === 'valueOf') {
    if (lastParts[1] === 'name') {
      // e.g. hc().somePath.name.valueOf() -> "somePath"
      return { handled: true, value: lastParts[2] || '' }
    }
    // e.g. hc().somePath.valueOf()
    return { handled: true, value: proxyCallback }
  }

  return { handled: false }
}

/**
 * Extracts the HTTP method (from a `$get`-style segment) and computes the merged
 * path/URL for the current proxy chain.
 */
const resolveMethodAndUrl = (
  lastParts: string[],
  parts: string[],
  baseUrl: string
): { method: string; url: string } => {
  const methodParts = [...parts]
  let method = ''
  if (/^\$/.test(lastParts[0] as string)) {
    const last = methodParts.pop()
    if (last) {
      method = last.replace(/^\$/, '')
    }
  }

  const path = methodParts.join('/')
  return { method, url: mergePath(baseUrl, path) }
}

/**
 * Builds a WebSocket connection for the `$ws` method.
 */
const establishWebSocket = (
  url: string,
  args: ClientArgs | undefined,
  options: ClientRequestOptions | undefined,
  buildSearchParamsOption: BuildSearchParamsFn
): WebSocket => {
  const normalizedUrl = removeIndexString(url)
  const webSocketUrl = replaceUrlProtocol(
    args?.param ? replaceUrlParam(normalizedUrl, args.param) : normalizedUrl,
    'ws'
  )
  const targetUrl = new URL(webSocketUrl)

  const queryParams: Record<string, string | string[]> | undefined = args?.query
  if (queryParams) {
    const searchParams = buildSearchParamsOption(queryParams)
    searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value)
    })
  }

  if (options?.webSocket !== undefined && typeof options.webSocket === 'function') {
    return options.webSocket(targetUrl.toString())
  }
  return new WebSocket(targetUrl.toString())
}

/**
 * Handles the `$url`, `$path` and `$ws` symbolic methods. Returns the computed result
 * when the method is symbolic, otherwise `undefined` so the caller builds a request.
 */
const handleSymbolicMethod = (
  method: string,
  url: string,
  args: ClientArgs | undefined,
  baseUrl: string,
  options: ClientRequestOptions | undefined,
  buildSearchParamsOption: BuildSearchParamsFn
): unknown => {
  if (method === 'url' || method === 'path') {
    // Strip the synthetic `index` segment before substituting params, so that a param
    // whose value is `index` is not mistaken for one.
    let result = removeIndexString(url)
    if (args) {
      if (args.param) {
        result = replaceUrlParam(result, args.param)
      }
      if (args.query) {
        result = appendQueryParams(result, buildSearchParamsOption(args.query))
      }
    }
    if (method === 'url') {
      return new URL(result)
    }
    return result.slice(baseUrl.replace(/\/+$/, '').length).replace(/^\/?/, '/')
  }

  if (method === 'ws') {
    return establishWebSocket(url, args, options, buildSearchParamsOption)
  }

  return undefined
}

/**
 * Builds a regular request (or the intermediate `ClientRequestImpl`) for the resolved
 * URL and HTTP method.
 */
const buildRegularRequest = (
  url: string,
  method: string,
  opts: ProxyCallbackArgs,
  options: ClientRequestOptions | undefined,
  buildSearchParamsOption: BuildSearchParamsFn
): unknown => {
  const req = new ClientRequestImpl(url, method, {
    buildSearchParams: buildSearchParamsOption,
  })
  if (method) {
    const reqOptions: ClientRequestOptions = { ...opts.args[1] }
    const baseHeaders = options?.headers
    const reqHeaders = reqOptions.headers
    if (baseHeaders && reqHeaders) {
      reqOptions.headers = async () => ({
        ...(typeof baseHeaders === 'function' ? await baseHeaders() : baseHeaders),
        ...(typeof reqHeaders === 'function' ? await reqHeaders() : reqHeaders),
      })
    }
    const args = deepMerge<ClientRequestOptions>(
      { ...options } as ClientRequestOptions,
      reqOptions
    )
    return req.fetch(opts.args[0], args)
  }
  return req
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const hc = <T extends Hono<any, any, any>, Prefix extends string = string>(
  baseUrl: Prefix,
  options?: ClientRequestOptions
) =>
  createProxy(function proxyCallback(opts: ProxyCallbackArgs) {
    const buildSearchParamsOption = options?.buildSearchParams ?? buildSearchParams
    const parts = [...opts.path]
    const lastParts = parts.slice(-3).reverse()

    // 1. .toString() / .valueOf() special handling
    const special = handleSpecialProxyMethods(lastParts, proxyCallback)
    if (special.handled) {
      return special.value
    }

    // 2. Resolve the method and URL for the current chain
    const { method, url } = resolveMethodAndUrl(lastParts, parts, baseUrl)

    // 3. Handle `$url`, `$path` and `$ws`
    const symbolic = handleSymbolicMethod(
      method,
      url,
      opts.args[0],
      baseUrl,
      options,
      buildSearchParamsOption
    )
    if (symbolic !== undefined) {
      return symbolic
    }

    // 4. Build and issue a regular request
    return buildRegularRequest(url, method, opts, options, buildSearchParamsOption)
  }, []) as UnionToIntersection<Client<T, Prefix>>
