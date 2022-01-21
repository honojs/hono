import { isAbsoluteURL } from './utils/url'

type Headers = { [key: string]: string }

export interface Env {}

export class Context {
  req: Request
  res: Response
  env: Env
  event: FetchEvent

  constructor(req: Request, opts?: { res: Response; env: Env; event: FetchEvent }) {
    this.req = req
    if (opts) {
      this.res = opts.res
      this.env = opts.env
      this.event = opts.event
    }
  }

  newResponse(body?: BodyInit | null | undefined, init?: ResponseInit | undefined): Response {
    return new Response(body, init)
  }

  text(text: string, status: number = 200, headers: Headers = {}): Response {
    if (typeof text !== 'string') {
      throw new TypeError('text method arg must be a string!')
    }

    headers['Content-Type'] = 'text/plain'

    return this.newResponse(text, {
      status: status,
      headers: headers,
    })
  }

  json(object: object, status: number = 200, headers: Headers = {}): Response {
    if (typeof object !== 'object') {
      throw new TypeError('json method arg must be a object!')
    }

    const body = JSON.stringify(object)
    headers['Content-Type'] = 'application/json; charset=UTF-8'

    return this.newResponse(body, {
      status: status,
      headers: headers,
    })
  }

  html(html: string, status: number = 200, headers: Headers = {}): Response {
    if (typeof html !== 'string') {
      throw new TypeError('html method arg must be a string!')
    }
    headers['Content-Type'] = 'text/html; charset=UTF-8'

    return this.newResponse(html, {
      status: status,
      headers: headers,
    })
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
