import { getStatusText } from '@/utils/http-status'
import type { StatusCode } from '@/utils/http-status'
import { isAbsoluteURL } from '@/utils/url'

type Headers = Record<string, string>
type Data = string | ArrayBuffer | ReadableStream

export interface Env {}

export class Context<RequestParamKeyType = string> {
  req: Request<RequestParamKeyType>
  res: Response
  env: Env
  event: FetchEvent

  #headers: Headers
  #status: StatusCode
  #statusText: string
  #pretty: boolean
  #prettySpace: number = 2

  render: (template: string, params?: object, options?: object) => Promise<Response>
  notFound: () => Response | Promise<Response>

  constructor(
    req: Request<RequestParamKeyType>,
    opts?: { res: Response; env: Env; event: FetchEvent }
  ) {
    this.req = this.initRequest(req)
    Object.assign(this, opts)
    this.#headers = {}
  }

  private initRequest<T>(req: Request<T>): Request<T> {
    req.header = (name: string): string => {
      return req.headers.get(name)
    }
    req.query = (key: string): string => {
      const url = new URL(req.url)
      return url.searchParams.get(key)
    }
    return req
  }

  header(name: string, value: string): void {
    if (this.res) {
      this.res.headers.set(name, value)
    }
    this.#headers[name] = value
  }

  status(status: StatusCode): void {
    if (this.res) {
      console.warn('c.res.status is already set.')
      return
    }
    this.#status = status
    this.#statusText = getStatusText(status)
  }

  pretty(prettyJSON: boolean, space: number = 2): void {
    this.#pretty = prettyJSON
    this.#prettySpace = space
  }

  newResponse(data: Data, init: ResponseInit = {}): Response {
    init.status = init.status || this.#status || 200
    init.statusText =
      init.statusText || this.#statusText || getStatusText(init.status as StatusCode)

    init.headers = { ...this.#headers, ...init.headers }

    // Content-Length
    let length = 0
    if (data) {
      if (data instanceof ArrayBuffer) {
        length = data.byteLength
      } else if (typeof data == 'string') {
        const Encoder = new TextEncoder()
        length = Encoder.encode(data).byteLength || 0
      }
    }
    init.headers = { ...init.headers, ...{ 'Content-Length': length.toString() } }

    return new Response(data, init)
  }

  body(data: Data, status: StatusCode = this.#status, headers: Headers = this.#headers): Response {
    return this.newResponse(data, {
      status: status,
      headers: headers,
    })
  }

  text(text: string, status: StatusCode = this.#status, headers: Headers = {}): Response {
    if (typeof text !== 'string') {
      throw new TypeError('text method arg must be a string!')
    }
    headers['Content-Type'] ||= 'text/plain; charset=UTF-8'
    return this.body(text, status, headers)
  }

  json(object: object, status: StatusCode = this.#status, headers: Headers = {}): Response {
    if (typeof object !== 'object') {
      throw new TypeError('json method arg must be an object!')
    }
    const body = this.#pretty
      ? JSON.stringify(object, null, this.#prettySpace)
      : JSON.stringify(object)
    headers['Content-Type'] ||= 'application/json; charset=UTF-8'
    return this.body(body, status, headers)
  }

  html(html: string, status: StatusCode = this.#status, headers: Headers = {}): Response {
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
}
