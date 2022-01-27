import { isAbsoluteURL } from './utils/url'

type Headers = { [key: string]: string }

export interface Env {}

export class Context {
  req: Request
  res: Response
  env: Env
  event: FetchEvent
  private _headers: Headers
  private _status: number
  private _statusText: string

  constructor(req: Request, opts?: { res: Response; env: Env; event: FetchEvent }) {
    this.req = req
    if (opts) {
      this.res = opts.res
      this.env = opts.env
      this.event = opts.event
    }
    this._headers = {}
  }

  header(name: string, value: string): void {
    this._headers[name] = value
  }

  status(number: number): void {
    this._status = number
  }

  statusText(text: string): void {
    this._statusText = text
  }

  newResponse(data: any, init: ResponseInit = {}): Response {
    init.status = init.status || this._status
    init.statusText = init.statusText || this._statusText

    const Encoder = new TextEncoder()
    const length = data ? data.bytelength || Encoder.encode(data).byteLength : 0
    init.headers = { ...this._headers, ...init.headers, ...{ 'Content-Length': String(length) } }

    return new Response(data, init)
  }

  body(data: any, status: number = this._status, headers: Headers = this._headers): Response {
    return this.newResponse(data, {
      status: status,
      headers: headers,
    })
  }

  text(text: string, status: number = this._status, headers: Headers = {}): Response {
    if (typeof text !== 'string') {
      throw new TypeError('text method arg must be a string!')
    }
    headers['Content-Type'] = 'text/plain'
    return this.body(text, status, headers)
  }

  json(object: object, status: number = this._status, headers: Headers = {}): Response {
    if (typeof object !== 'object') {
      throw new TypeError('json method arg must be a object!')
    }

    const body = JSON.stringify(object)
    headers['Content-Type'] = 'application/json; charset=UTF-8'
    return this.body(body, status, headers)
  }

  html(html: string, status: number = this._status, headers: Headers = {}): Response {
    if (typeof html !== 'string') {
      throw new TypeError('html method arg must be a string!')
    }
    headers['Content-Type'] = 'text/html; charset=UTF-8'
    return this.body(html, status, headers)
  }

  redirect(location: string, status: number = 302): Response {
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
}
