import type { Hono } from '../hono.ts'
import type { ValidationTypes } from '../types.ts'
import type { UnionToIntersection } from '../utils/types.ts'
import type { Callback, Client, RequestOption } from './types.ts'
import { replaceUrlParam, mergePath, removeIndexString } from './utils.ts'

const createProxy = (callback: Callback, path: string[]) => {
  const proxy: unknown = new Proxy(() => {}, {
    get(_obj, key) {
      if (typeof key !== 'string') return undefined
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
  fetch = (
    args?: ValidationTypes & {
      param?: Record<string, string>
    },
    opt?: RequestOption
  ) => {
    if (args) {
      if (args.query) {
        for (const [k, v] of Object.entries(args.query)) {
          this.queryParams ||= new URLSearchParams()
          this.queryParams.set(k, v)
        }
      }

      if (args.queries) {
        for (const [k, v] of Object.entries(args.queries)) {
          for (const v2 of v) {
            this.queryParams ||= new URLSearchParams()
            this.queryParams.append(k, v2)
          }
        }
      }

      if (args.form) {
        const form = new FormData()
        for (const [k, v] of Object.entries(args.form)) {
          form.append(k, v)
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
    let setBody = !(methodUpperCase === 'GET' || methodUpperCase === 'HEAD')

    const headerValues: Record<string, string> = opt?.headers ? opt.headers : {}
    if (this.cType) headerValues['Content-Type'] = this.cType

    const headers = new Headers(headerValues ?? undefined)
    let url = this.url

    url = removeIndexString(url)
    url = replaceUrlParam(url, this.pathParams)

    if (this.queryParams) {
      url = url + '?' + this.queryParams.toString()
    }
    methodUpperCase = this.method.toUpperCase()
    setBody = !(methodUpperCase === 'GET' || methodUpperCase === 'HEAD')

    // Pass URL string to 1st arg for testing with MSW and node-fetch
    return fetch(url, {
      body: setBody ? this.rBody : undefined,
      method: methodUpperCase,
      headers: headers,
    })
  }
}

export const hc = <T extends Hono>(baseUrl: string) =>
  createProxy(async (opts) => {
    const parts = [...opts.path]

    let method = ''
    if (/^\$/.test(parts[parts.length - 1])) {
      const last = parts.pop()
      if (last) {
        method = last.replace(/^\$/, '')
      }
    }

    const path = parts.join('/')
    const url = mergePath(baseUrl, path)
    const req = new ClientRequestImpl(url, method)
    if (method) {
      return req.fetch(opts.args[0], opts.args[1])
    }
    return req
  }, []) as UnionToIntersection<Client<T>>
