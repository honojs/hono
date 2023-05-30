import { Hono } from '../../hono'
import { headMethod } from './index'

describe('Head Method Middleware', () => {
  const app = new Hono()

  app.use('/page/*', headMethod({ app }))
  app.use('*', async (c, next) => {
    await next()
    c.header('foo2', 'bar2')
  })

  app.get('/page', (c) => {
    c.header('foo', 'bar')
    return c.text('page')
  })

  it('Should return 200 response with body - GET /page', async () => {
    const res = await app.request('/page')
    expect(res.status).toBe(200)
    expect(res.headers.get('foo')).toBe('bar')
    expect(res.headers.get('foo2')).toBe('bar2')
    expect(await res.text()).toBe('page')
  })

  it('Should return 200 response without body - HEAD /page', async () => {
    const res = await app.request('/page', {
      method: 'HEAD',
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('foo')).toBe('bar')
    expect(res.headers.get('foo2')).toBe('bar2')
    expect(res.body).toBeNull()
  })
})
