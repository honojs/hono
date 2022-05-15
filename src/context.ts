import type { StatusCode } from './utils/http-status'
import { getStatusText } from './utils/http-status'
import { isAbsoluteURL } from './utils/url'

type Headers = Record<string, string>
type Data = string | ArrayBuffer | ReadableStream

export type Env = Record<string, any>

export class Context<RequestParamKeyType = string, E = Env> {
  req: Request<RequestParamKeyType>
  res: Response | undefined
  env: E | undefined
  event: FetchEvent | undefined

  private _headers: Headers = {}
  private _status: StatusCode = 200
  private _statusText = ''
  private _pretty = false
  private _prettySpace = 2
  private _map: {
    [key: string]: any
  }

  render: ((template: string, params?: object, options?: object) => Promise<Response>) | undefined
  notFound = () => new Response('Not Found', { status: 404 })

  constructor(
    req: Request<RequestParamKeyType>,
    opts?: {
      res?: Response
      env?: E
      event?: FetchEvent
    }
  ) {
    this.req = this.initRequest<RequestParamKeyType>(req)
    this._map = {}
    Object.assign(this, opts)
  }

  private initRequest<T>(req: Request<T>): Request<T> {
    req.header = (name: string): string => {
      return req.headers.get(name) || ''
    }
    req.query = (key: string): string => {
      const url = new URL(req.url)
      return url.searchParams.get(key) || ''
    }
    return req
  }

  header(name: string, value: string): void {
    if (this.res) {
      this.res.headers.set(name, value)
    }
    this._headers[name] = value
  }

  status(status: StatusCode): void {
    this._status = status
    this._statusText = getStatusText(status)
  }

  set(key: string, value: any): void {
    this._map[key] = value
  }

  get(key: string) {
    return this._map[key]
  }

  pretty(prettyJSON: boolean, space = 2): void {
    this._pretty = prettyJSON
    this._prettySpace = space
  }

  newResponse(data: Data, init: ResponseInit = {}): Response {
    init.status = init.status || this._status || 200
    init.statusText =
      init.statusText || this._statusText || getStatusText(init.status as StatusCode)
    init.headers = { ...this._headers, ...init.headers }

    return new Response(data, init)
  }

  body(data: Data, status: StatusCode = this._status, headers: Headers = this._headers): Response {
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
    return this.newResponse('', {
      status: status,
      headers: {
        Location: location,
      },
    })
  }
}
