import { Hono } from '@/hono'
import { mustache } from '@/middleware/mustache'

// Mock
const store: { [key: string]: string } = {
  'index.abcdef.mustache': '{{> header}}Title: {{ title }}{{> footer}}',
  'header.abcdef.mustache': '<html><body>',
  'footer.abcdef.mustache': '</body></html>',
  'view/index.abcdef.mustache': '<h1>With Root</h1>',
}
const manifest = JSON.stringify({
  'index.mustache': 'index.abcdef.mustache',
  'header.mustache': 'header.abcdef.mustache',
  'footer.mustache': 'footer.abcdef.mustache',
  'view/index.mustache': 'view/index.abcdef.mustache',
})

Object.assign(global, { __STATIC_CONTENT_MANIFEST: manifest })
Object.assign(global, {
  __STATIC_CONTENT: {
    get: (path: string) => {
      return store[path]
    },
  },
})

describe('Mustache by Middleware', () => {
  const app = new Hono()

  app.use('/foo', mustache())
  app.get('/foo', (c) => {
    return c.render(
      'index',
      { title: 'Hono!' },
      {
        header: 'header',
        footer: 'footer',
      }
    )
  })

  app.use('/bar', mustache({ root: 'view' }))
  app.get('/bar', (c) => {
    return c.render('index')
  })

  it('Mustache template redering', async () => {
    const req = new Request('http://localhost/foo')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<html><body>Title: Hono!</body></html>')
  })

  it('Mustache template redering with root', async () => {
    const req = new Request('http://localhost/bar')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>With Root</h1>')
  })
})
