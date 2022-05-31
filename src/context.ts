import { HonoResponse } from './response'
import type { StatusCode } from './utils/http-status'
import { isAbsoluteURL } from './utils/url'

type Headers = Record<string, string>
export type Data = string | ArrayBuffer | ReadableStream

export type Env = Record<string, any>

export class Context<RequestParamKeyType extends string = string, E = Env> {
  req: Request<RequestParamKeyType>
  res: Response
  env: E
  event: FetchEvent | undefined

  private _status: StatusCode = 200
  private _pretty: boolean = false
  private _prettySpace: number = 2
  private _map: {
    [key: string]: any
  }
  private notFoundHandler: (c: Context<string, E>) => Response

  render: (template: string, params?: object, options?: object) => Promise<Response>

  constructor(
    req: Request<RequestParamKeyType>,
    env: E | undefined,
    event: FetchEvent | undefined,
    notFoundHandler: (c: Context<string, E>) => Response
  ) {
    this.req = req
    this._map = {}

    if (env) {
      this.env = env
    }
    this.event = event
    this.notFoundHandler = notFoundHandler

    if (!this.res) {
      const res = new HonoResponse(null, { status: 404 })
      res._finalized = false
      this.res = res
    }
  }

  header(name: string, value: string): void {
    this.res.headers.set(name, value)
  }

  status(status: StatusCode): void {
    this._status = status
  }

  set(key: string, value: any): void {
    this._map[key] = value
  }

  get(key: string) {
    return this._map[key]
  }

  pretty(prettyJSON: boolean, space: number = 2): void {
    this._pretty = prettyJSON
    this._prettySpace = space
  }

  newResponse(data: Data | null, init: ResponseInit = {}): Response {
    init.status = init.status || this._status || 200
    const headers: Record<string, string> = {}
    this.res.headers.forEach((v, k) => {
      headers[k] = v
    })
    init.headers = Object.assign(headers, init.headers)

    return new Response(data, init)
  }

  body(data: Data | null, status: StatusCode = this._status, headers: Headers = {}): Response {
    return this.newResponse(data, {
      status: status,
      headers: headers,
    })
  }

  text(text: string, status: StatusCode = this._status, headers: Headers = {}): Response {
    if (typeof text !== 'string') {
      throw new TypeError('text method arg must be a string!')
    }
    headers['Content-Type'] ||= 'text/plain; charset=UTF-8'
    return this.body(text, status, headers)
  }

  json(object: object, status: StatusCode = this._status, headers: Headers = {}): Response {
    if (typeof object !== 'object') {
      throw new TypeError('json method arg must be an object!')
    }
    const body = this._pretty
      ? JSON.stringify(object, null, this._prettySpace)
      : JSON.stringify(object)
    headers['Content-Type'] ||= 'application/json; charset=UTF-8'
    return this.body(body, status, headers)
  }

  html(html: string, status: StatusCode = this._status, headers: Headers = {}): Response {
    if (typeof html !== 'string') {
      throw new TypeError('html method arg must be a string!')
    }
    headers['Content-Type'] ||= 'text/html; charset=UTF-8'
    return this.body(html, status, headers)
  }

  redirect(location: string, status: StatusCode = 302): Response {
    if (typeof location !== 'string') {
      throw new TypeError('location must be a string!')
    }
    if (!isAbsoluteURL(location)) {
      const url = new URL(this.req.url)
      url.pathname = location
      location = url.toString()
    }
    return this.newResponse(null, {
      status: status,
      headers: {
        Location: location,
      },
    })
  }

  notFound(): Response | Promise<Response> {
    return this.notFoundHandler(this as any)
  }
}
