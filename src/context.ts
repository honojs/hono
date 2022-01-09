import { isAbsoluteURL } from './util'

type Headers = { [key: string]: string }

export class Context {
  req: Request
  res: Response

  constructor(req: Request, res: Response) {
    this.req = req
    this.res = res
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
