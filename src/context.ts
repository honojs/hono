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

  text(body: string): Response {
    if (typeof body !== 'string') {
      throw new TypeError('text method arg must be a string!')
    }

    return this.newResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }

  json(object: object, replacer?: (string | number)[], space?: string | number): Response {
    if (typeof object !== 'object') {
      throw new TypeError('json method arg must be a object!')
    }

    const body = JSON.stringify(object, replacer, space)

    return this.newResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
    })
  }
}
