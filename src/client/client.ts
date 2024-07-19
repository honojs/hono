import type { Hono } from '../hono'
import type { FormValue, Schema, ValidationTargets } from '../types'
import { serialize } from '../utils/cookie'
import type { UnionToIntersection } from '../utils/types'
import type { Callback, Client, ClientRequestOptions } from './types'
import {
  deepMerge,
  mergePath,
  removeIndexString,
  replaceUrlParam,
  replaceUrlProtocol,
} from './utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createProxy<T extends Hono<any, Schema, string>>(callback: Callback, path: string[]) {
  const proxy = new Proxy(() => {}, {
    get(_obj, key) {
      if (typeof key !== 'string' || key === 'then') {
        return undefined
      }
      return createProxy(callback, [...path, key])
    },
    apply(_1, _2, args: (ValidationTargets & { param: Record<string, string> })[]) {
      return callback({
        path,
        args,
      })
    },
  }) as UnionToIntersection<Client<T>>
  return proxy
}

class ClientRequestImpl {
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
        for (const [k, v] of Object.entries(args.query)) {
          if (v === undefined) {
            continue
          }

          this.queryParams ||= new URLSearchParams()
          if (Array.isArray(v)) {
            for (const v2 of v) {
              this.queryParams.append(k, v2)
            }
          } else {
            this.queryParams.set(k, v)
          }
        }
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
      ...(args?.header ?? {}),
      ...(typeof opt?.headers === 'function'
        ? await opt.headers()
        : opt?.headers
        ? opt.headers
        : {}),
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

    const headers = new Headers(headerValues ?? undefined)
    let url = this.url

    url = removeIndexString(url)
    url = replaceUrlParam(url, this.pathParams)

    if (this.queryParams) {
      url = url + '?' + this.queryParams.toString()
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const hc = <T extends Hono<any, Schema, string>>(
  baseUrl: string,
  options?: ClientRequestOptions
) =>
  createProxy(function proxyCallback(opts) {
    const parts = [...opts.path]

    // allow calling .toString() and .valueOf() on the proxy
    if (parts[parts.length - 1] === 'toString') {
      if (parts[parts.length - 2] === 'name') {
        // e.g. hc().somePath.name.toString() -> "somePath"
        return parts[parts.length - 3] || ''
      }
      // e.g. hc().somePath.toString()
      return proxyCallback.toString()
    }

    if (parts[parts.length - 1] === 'valueOf') {
      if (parts[parts.length - 2] === 'name') {
        // e.g. hc().somePath.name.valueOf() -> "somePath"
        return parts[parts.length - 3] || ''
      }
      // e.g. hc().somePath.valueOf()
      return proxyCallback
    }

    let method = ''
    if (/^\$/.test(parts[parts.length - 1])) {
      const last = parts.pop()
      if (last) {
        method = last.replace(/^\$/, '')
      }
    }

    const path = parts.join('/')
    const url = mergePath(baseUrl, path)
    if (method === 'url') {
      if (opts.args[0] && opts.args[0].param) {
        return new URL(replaceUrlParam(url, opts.args[0].param))
      }
      return new URL(url)
    }
    if (method === 'ws') {
      const webSocketUrl = replaceUrlProtocol(
        opts.args[0] && opts.args[0].param ? replaceUrlParam(url, opts.args[0].param) : url,
        'ws'
      )
      const targetUrl = new URL(webSocketUrl)
      for (const key in opts.args[0]?.query ?? []) {
        const value = opts.args[0].query[key]
        targetUrl.searchParams.set(key, Array.isArray(value) ? value.join(',') : value)
      }

      return new WebSocket(targetUrl.toString())
    }

    const req = new ClientRequestImpl(url, method)
    if (method) {
      options ??= {}
      const args = deepMerge<ClientRequestOptions>(options, { ...(opts.args[1] ?? {}) })
      return req.fetch(opts.args[0], args)
    }
    return req
  }, []) as UnionToIntersection<Client<T>>
