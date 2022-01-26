import { compose } from '../src/compose'

type C = {
  req: { [key: string]: string }
  res: { [key: string]: string }
}

describe('compose middleware', () => {
  const middleware: Function[] = []

  const a = async (c: C, next: Function) => {
    c.req['log'] = 'log'
    await next()
  }
  middleware.push(a)

  const b = async (c: C, next: Function) => {
    await next()
    c.res['headers'] = `${c.res.headers}-custom-header`
  }
  middleware.push(b)

  const handler = async (c: C, next: Function) => {
    c.req['log'] = `${c.req.log} message`
    await next()
    c.res = { message: 'new response' }
  }
  middleware.push(handler)

  const request = {}
  const response = {}

  it('Request', async () => {
    const c: C = { req: request, res: response }
    const composed = compose(middleware)
    await composed(c)
    expect(c.req['log']).not.toBeNull()
    expect(c.req['log']).toBe('log message')
  })
  it('Response', async () => {
    const c: C = { req: request, res: response }
    const composed = compose(middleware)
    await composed(c)
    expect(c.res['header']).not.toBeNull()
    expect(c.res['message']).toBe('new response')
  })
})
