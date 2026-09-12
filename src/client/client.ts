import type { Hono } from '../hono'
import type { FormValue, ValidationTargets } from '../types'
import { serialize } from '../utils/cookie'
import type { UnionToIntersection } from '../utils/types'
import type { BuildSearchParamsFn, Callback, Client, ClientRequestOptions, ClientX } from './types'
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
  fetch = async (
    args?: ValidationTargets<FormValue> & {
      param?: Record<string, string>
    },
    opt?: ClientRequestOptions
  ) => {
    if (args) {
      if (args.query) {
        this.queryParams = this.buildSearchParams(args.query)
      }

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

      if (args.json !== undefined) {
        this.rBody = JSON.stringify(args.json)
        this.cType = 'application/json'
      }

      if (args.param) {
        this.pathParams = args.param
      }
    }

    let methodUpperCase = this.method.toUpperCase()

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
    let url = this.url

    url = removeIndexString(url)
    url = replaceUrlParam(url, this.pathParams)

    if (this.queryParams) {
      url = appendQueryParams(url, this.queryParams)
    }
    methodUpperCase = this.method.toUpperCase()
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

const createCallback = (baseUrl: string, options?: ClientRequestOptions): Callback =>
  function proxyCallback(opts) {
    const buildSearchParamsOption = options?.buildSearchParams ?? buildSearchParams
    const parts = [...opts.path]
    const lastParts = parts.slice(-3).reverse()

    // allow calling .toString() and .valueOf() on the proxy
    if (lastParts[0] === 'toString') {
      if (lastParts[1] === 'name') {
        // e.g. hc().somePath.name.toString() -> "somePath"
        return lastParts[2] || ''
      }
      // e.g. hc().somePath.toString()
      return proxyCallback.toString()
    }

    if (lastParts[0] === 'valueOf') {
      if (lastParts[1] === 'name') {
        // e.g. hc().somePath.name.valueOf() -> "somePath"
        return lastParts[2] || ''
      }
      // e.g. hc().somePath.valueOf()
      return proxyCallback
    }

    let method = ''
    if (/^\$/.test(lastParts[0] as string)) {
      const last = parts.pop()
      if (last) {
        method = last.replace(/^\$/, '')
      }
    }

    const path = parts.join('/')
    const url = mergePath(baseUrl, path)
    if (method === 'url' || method === 'path') {
      // Strip the synthetic `index` segment before substituting params, so that a param
      // whose value is `index` is not mistaken for one.
      let result = removeIndexString(url)
      if (opts.args[0]) {
        if (opts.args[0].param) {
          result = replaceUrlParam(result, opts.args[0].param)
        }
        if (opts.args[0].query) {
          result = appendQueryParams(result, buildSearchParamsOption(opts.args[0].query))
        }
      }
      if (method === 'url') {
        return new URL(result)
      }
      return result.slice(baseUrl.replace(/\/+$/, '').length).replace(/^\/?/, '/')
    }
    if (method === 'ws') {
      const normalizedUrl = removeIndexString(url)
      const webSocketUrl = replaceUrlProtocol(
        opts.args[0]?.param ? replaceUrlParam(normalizedUrl, opts.args[0].param) : normalizedUrl,
        'ws'
      )
      const targetUrl = new URL(webSocketUrl)

      const queryParams: Record<string, string | string[]> | undefined = opts.args[0]?.query
      if (queryParams) {
        const searchParams = buildSearchParamsOption(queryParams)
        searchParams.forEach((value, key) => {
          targetUrl.searchParams.append(key, value)
        })
      }
      const establishWebSocket = (...args: ConstructorParameters<typeof WebSocket>) => {
        if (options?.webSocket !== undefined && typeof options.webSocket === 'function') {
          return options.webSocket(...args)
        }
        return new WebSocket(...args)
      }

      return establishWebSocket(targetUrl.toString())
    }

    const req = new ClientRequestImpl(url, method, {
      buildSearchParams: buildSearchParamsOption,
    })
    if (method) {
      options ??= {}
      const reqOptions: ClientRequestOptions = { ...opts.args[1] }
      const baseHeaders = options.headers
      const reqHeaders = reqOptions.headers
      if (baseHeaders && reqHeaders) {
        reqOptions.headers = async () => ({
          ...(typeof baseHeaders === 'function' ? await baseHeaders() : baseHeaders),
          ...(typeof reqHeaders === 'function' ? await reqHeaders() : reqHeaders),
        })
      }
      const args = deepMerge<ClientRequestOptions>(options, reqOptions)
      return req.fetch(opts.args[0], args)
    }
    return req
  }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const hc = <T extends Hono<any, any, any>, Prefix extends string = string>(
  baseUrl: Prefix,
  options?: ClientRequestOptions
) => createProxy(createCallback(baseUrl, options), []) as UnionToIntersection<Client<T, Prefix>>

/** What `hc`'s own proxy would have collected: `:name` segments in `path`, their values in `param`. */
type Chain = { path: string[]; param: Record<string, string> }

/**
 * A `hono/client` RPC client where a path param is bound by calling the segment, the JSON body is
 * positional and everything else rides in one options object. Same wire behavior and same response
 * types as {@link hc}.
 *
 * @example
 * ```ts
 * const api = hcx<typeof app>('http://localhost')
 * await api.users.$get({ query: { page: '2' } })  // GET /users?page=2
 * await api.users({ id: '1' }).$get()             // GET /users/1
 * await api.users.$post({ name: 'Bolt' })         // POST /users, JSON body
 * await api.upload.$post.form({ file })           // multipart
 * api.users({ id: '1' }).$path()                  // '/users/1'
 * ```
 *
 * Known quirks, shared with `hc` unless noted: a static segment named like a `$method` collides;
 * `/` is on the root node and under `api.index`; `/users` and `/users/:id?` union on `api.users`;
 * a validated `header` shares the options object with `headers`; `InferRequestType` on a read
 * yields that options type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const hcx = <T extends Hono<any, any, any>, Prefix extends string = string>(
  baseUrl: Prefix,
  options?: ClientRequestOptions
) => {
  const callback = createCallback(baseUrl, options)
  const send = (chain: Chain, method: string, args: unknown[], target: 'json' | 'form') => {
    // `$get`, `$url`, `$path` and `$ws` take options first, every other method takes the body first.
    const optionsFirst =
      method === '$get' || method === '$url' || method === '$path' || method === '$ws'
    const { query, header, cookie, ...rest } = ((optionsFirst ? args[0] : args[1]) ?? {}) as Record<
      string,
      unknown
    >
    const request = {
      param: chain.param,
      query,
      header,
      cookie,
      [target]: optionsFirst ? undefined : args[0],
    }
    return callback({ path: [...chain.path, method], args: [request, rest] })
  }
  const leaf = (chain: Chain, method: string): unknown =>
    new Proxy(() => {}, {
      get: (target, key) =>
        key === 'form'
          ? (...args: unknown[]) => send(chain, method, args, 'form')
          : Reflect.get(target, key),
      apply: (_1, _2, args) => send(chain, method, args, 'json'),
    })
  const node = (chain: Chain): unknown =>
    new Proxy(() => {}, {
      get: (target, key) => {
        if (typeof key !== 'string' || key === 'then') {
          return undefined
        }
        if (key === 'toString' || key === 'valueOf') {
          return Reflect.get(target, key)
        }
        if (key.startsWith(':')) {
          throw new Error(
            `hcx: \`${key}\` is a type-only key, bind the param by calling the segment instead: \`({ ${key.slice(1)}: value })\``
          )
        }
        return key.startsWith('$')
          ? leaf(chain, key)
          : node({ path: [...chain.path, key], param: chain.param })
      },
      apply: (_1, _2, [params]) => {
        const entries = params && typeof params === 'object' ? Object.entries(params) : []
        if (entries.length !== 1) {
          throw new Error(
            "hcx: a segment call binds exactly one path param, e.g. `api.users({ id: '1' })`"
          )
        }
        const [name, value] = entries[0]
        return node({
          path: [...chain.path, `:${name}`],
          param: { ...chain.param, [name]: value as string },
        })
      },
    })
  return node({ path: [], param: {} }) as ClientX<T, Prefix>
}
