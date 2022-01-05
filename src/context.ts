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

  text(body: string) {
    if (typeof body !== 'string') {
      throw new TypeError('text arg must be a string!')
    }

    return this.newResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }
}
