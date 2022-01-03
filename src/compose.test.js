const compose = require('./compose')

describe('compose middleware', () => {
  const middleware = []

  const a = async (c, next) => {
    c.req['log'] = 'log'
    await next()
  }
  middleware.push(a)

  const b = async (c, next) => {
    await next()
    c.res['header'] = `${c.res.header}-custom-header`
  }
  middleware.push(b)

  const handler = async (c, next) => {
    c.req['log'] = `${c.req.log} message`
    await next()
    c.res = { message: 'new response' }
  }
  middleware.push(handler)

  const request = {}
  const response = {}

  it('Request', async () => {
    const c = { req: request, res: response }
    const composed = compose(middleware)
    await composed(c)
    expect(c.req['log']).not.toBeNull()
    expect(c.req['log']).toBe('log message')
  })
  it('Response', async () => {
    const c = { req: request, res: response }
    const composed = compose(middleware)
    await composed(c)
    expect(c.res['header']).not.toBeNull()
    expect(c.res['message']).toBe('new response')
  })
})
