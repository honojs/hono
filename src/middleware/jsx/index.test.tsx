import { Hono } from '../../hono'
import { h, jsx } from '.'

describe('JSX middleware', () => {
  const app = new Hono()
  app.use('*', jsx())

  it('Should render HTML strings', async () => {
    app.get('/', (c) => {
      return c.render(<h1>Hello</h1>)
    })
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
    expect(await res.text()).toBe('<!doctype html><h1>Hello</h1>')
  })
})
