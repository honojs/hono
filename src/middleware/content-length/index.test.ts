import { Hono } from '../../hono'
import { contentLength } from '.'

describe('Content Length Middleware', () => {
  const app = new Hono()

  app.use('*', contentLength())
  app.get('/', (c) => {
    return c.text('Hono')
  })
  app.get('/kanji', (c) => {
    return c.text('炎')
  })

  it('Should return the correct content length', async () => {
    let res = await app.request('/')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Length')).toBe('4')
    expect(await res.text()).toBe('Hono')

    res = await app.request('/kanji')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Length')).toBe('3')
    expect(await res.text()).toBe('炎')
  })
})
