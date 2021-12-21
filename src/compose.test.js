const compose = require('./compose')

describe('compose middleware', () => {
  const middleware = []

  const a = (c, next) => {
    c.req['log'] = 'log'
    next()
  }
  middleware.push(a)

  const b = (c, next) => {
    next()
    c.res['header'] = `${c.res.header}-custom-header`
  }
  middleware.push(b)

  const handler = (c, next) => {
    c.req['log'] = `${c.req.log} message`
    next()
    c.res = { message: 'new response' }
  }
  middleware.push(handler)

  const request = {}
  const response = {}

  it('Request', () => {
    const c = { req: request, res: response }
    const composed = compose(middleware)
    composed(c)
    expect(c.req['log']).not.toBeNull()
    expect(c.req['log']).toBe('log message')
  })
  it('Response', () => {
    const c = { req: request, res: response }
    const composed = compose(middleware)
    composed(c)
    expect(c.res['header']).not.toBeNull()
    expect(c.res['message']).toBe('new response')
  })
})
