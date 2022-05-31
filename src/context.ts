import type { StatusCode } from './utils/http-status'
import { isAbsoluteURL } from './utils/url'

type Headers = Record<string, string>
export type Data = string | ArrayBuffer | ReadableStream

export type Env = Record<string, any>

export class Context<RequestParamKeyType extends string = string, E = Env> {
  req: Request<RequestParamKeyType>
  env: E
  event: FetchEvent | undefined
  finalized: boolean

  private _status: StatusCode = 200
  private _pretty: boolean = false
  private _prettySpace: number = 2
  private _map: Record<string, any> | undefined
  private _headers: Record<string, string> | undefined
  private _res: Response | undefined
  private notFoundHandler: (c: Context<string, E>) => Response

  render: (template: string, params?: object, options?: object) => Promise<Response>

  constructor(
    req: Request<RequestParamKeyType>,
    env: E | undefined,
    event: FetchEvent | undefined,
    notFoundHandler: (c: Context<string, E>) => Response
  ) {
    this.req = req

    if (env) {
      this.env = env
    }
    this.event = event
    this.notFoundHandler = notFoundHandler
    this.finalized = false
  }

  get res(): Response {
    return (this._res ||= new Response())
  }

  set res(_res: Response) {
    this._res = _res
  }

  header(name: string, value: string): void {
    this._headers ||= {}
    this._headers[name] = value
  }

  status(status: StatusCode): void {
    this._status = status
  }

  set(key: string, value: any): void {
    this._map ||= {}
    this._map[key] = value
  }

  get(key: string) {
    if (!this._map) {
      return undefined
    }
    return this._map[key]
  }

  pretty(prettyJSON: boolean, space: number = 2): void {
    this._pretty = prettyJSON
    this._prettySpace = space
  }

  newResponse(data: Data | null, status: StatusCode, headers: Headers = {}): Response {
    const _headers = Object.assign({}, this._headers, headers)
    if (this._res) {
      this._res.headers.forEach((v, k) => {
        _headers[k] = v
      })
    }
    return new Response(data, {
      status: status || this._status || 200,
      headers: _headers,
    })
  }

  body(data: Data | null, status: StatusCode = this._status, headers: Headers = {}): Response {
    return this.newResponse(data, status, headers)
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
    return this.newResponse(null, status, {
      Location: location,
    })
  }

  notFound(): Response | Promise<Response> {
    return this.notFoundHandler(this as any)
  }
}
