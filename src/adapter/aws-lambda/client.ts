import type { Hono } from '../../hono'
import type { FormValue, ValidationTargets } from '../../types'
import { serialize } from '../../utils/cookie'
import type { UnionToIntersection } from '../../utils/types'
import type { Client, ClientRequestOptions } from '../../client/types'
import { createProxy } from '../../client/client'
import {
  buildSearchParams,
  deepMerge,
  mergePath,
  removeIndexString,
  replaceUrlParam,
  replaceUrlProtocol,
} from '../../client/utils'

export const calculateSHA256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashBytes = new Uint8Array(hashBuffer);

  let hashHex = "";
  for (let i = 0; i < hashBytes.length; i++) {
    const b = hashBytes[i];
    hashHex += b < 16 ? '0' + b.toString(16) : b.toString(16);
  }

  return hashHex;
};

class LambdaClientRequestImpl {
  private url: string
  private method: string
  private queryParams: URLSearchParams | undefined = undefined
  private pathParams: Record<string, string> = {}
  private rBody: BodyInit | undefined
  private cType: string | undefined = undefined

  constructor(url: string, method: string) {
    this.url = url
    this.method = method
  }
  fetch = async (
    args?: ValidationTargets<FormValue> & {
      param?: Record<string, string>
    },
    opt?: ClientRequestOptions
  ) => {
    if (args) {
      if (args.query) {
        this.queryParams = buildSearchParams(args.query)
      }

      if (args.form) {
        const form = new FormData()
        for (const [k, v] of Object.entries(args.form)) {
          if (Array.isArray(v)) {
            for (const v2 of v) {
              form.append(k, v2)
            }
          } else {
            form.append(k, v)
          }
        }
        this.rBody = form
      }

      if (args.json) {
        this.rBody = JSON.stringify(args.json)
        this.cType = 'application/json'
      }

      if (args.param) {
        this.pathParams = args.param
      }
    }

    let methodUpperCase = this.method.toUpperCase()

    const headerValues: Record<string, string> = {
      ...args?.header,
      ...(typeof opt?.headers === 'function' ? await opt.headers() : opt?.headers),
    }

    if (args?.cookie) {
      const cookies: string[] = []
      for (const [key, value] of Object.entries(args.cookie)) {
        cookies.push(serialize(key, value, { path: '/' }))
      }
      headerValues['Cookie'] = cookies.join(',')
    }

    if (this.cType) {
      headerValues['Content-Type'] = this.cType
    }

    if ((methodUpperCase === 'POST' || methodUpperCase === 'PUT') && this.rBody && typeof this.rBody === 'string') {
      const hash = await calculateSHA256(this.rBody)
      headerValues['x-amz-content-sha256'] = hash
    }

    const headers = new Headers(headerValues ?? undefined)
    let url = this.url

    url = removeIndexString(url)
    url = replaceUrlParam(url, this.pathParams)

    if (this.queryParams) {
      url = url + '?' + this.queryParams.toString()
    }
    methodUpperCase = this.method.toUpperCase()
    const setBody = !(methodUpperCase === 'GET' || methodUpperCase === 'HEAD')

    return (opt?.fetch || fetch)(url, {
      body: setBody ? this.rBody : undefined,
      method: methodUpperCase,
      headers: headers,
      ...opt?.init,
    })
  }
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const hlc = <T extends Hono<any, any, any>>(
  baseUrl: string,
  options?: ClientRequestOptions
) =>
  createProxy(function proxyCallback(opts) {
    const parts = [...opts.path]

    // allow calling .toString() and .valueOf() on the proxy
    if (parts.at(-1) === 'toString') {
      if (parts.at(-2) === 'name') {
        // e.g. hc().somePath.name.toString() -> "somePath"
        return parts.at(-3) || ''
      }
      // e.g. hc().somePath.toString()
      return proxyCallback.toString()
    }

    if (parts.at(-1) === 'valueOf') {
      if (parts.at(-2) === 'name') {
        // e.g. hc().somePath.name.valueOf() -> "somePath"
        return parts.at(-3) || ''
      }
      // e.g. hc().somePath.valueOf()
      return proxyCallback
    }

    let method = ''
    if (/^\$/.test(parts.at(-1) as string)) {
      const last = parts.pop()
      if (last) {
        method = last.replace(/^\$/, '')
      }
    }

    const path = parts.join('/')
    const url = mergePath(baseUrl, path)
    if (method === 'url') {
      let result = url
      if (opts.args[0]) {
        if (opts.args[0].param) {
          result = replaceUrlParam(url, opts.args[0].param)
        }
        if (opts.args[0].query) {
          result = result + '?' + buildSearchParams(opts.args[0].query).toString()
        }
      }
      return new URL(result)
    }
    if (method === 'ws') {
      const webSocketUrl = replaceUrlProtocol(
        opts.args[0] && opts.args[0].param ? replaceUrlParam(url, opts.args[0].param) : url,
        'ws'
      )
      const targetUrl = new URL(webSocketUrl)

      const queryParams: Record<string, string | string[]> | undefined = opts.args[0]?.query
      if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((item) => targetUrl.searchParams.append(key, item))
          } else {
            targetUrl.searchParams.set(key, value)
          }
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

    const req = new LambdaClientRequestImpl(url, method)
    if (method) {
      options ??= {}
      const args = deepMerge<ClientRequestOptions>(options, { ...opts.args[1] })
      return req.fetch(opts.args[0], args)
    }
    return req
  }, []) as UnionToIntersection<Client<T>>
