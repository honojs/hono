import { Hono } from '../../hono.ts'
import { mustache } from './mustache.ts'

// Mock
const store: { [key: string]: string } = {
  'index.abcdef.mustache': '{{> header}}Title: {{ title }}{{> footer}}',
  'header.abcdef.mustache': '<html><body>',
  'footer.abcdef.mustache': '</body></html>',
  'view/index.abcdef.mustache': '<h1>With Root</h1>',
  'view/options.abcdef.mustache': '<h1>With Options</h1>',
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

  const manifest = {
    'view/options.mustache': 'view/options.abcdef.mustache',
  }
  app.use('/options', mustache({ root: 'view', manifest: manifest }))
  app.get('/options', (c) => {
    return c.render('options')
  })

  it('Mustache template rendering', async () => {
    const res = await app.request('http://localhost/foo')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<html><body>Title: Hono!</body></html>')
  })

  it('Mustache template rendering with root', async () => {
    const res = await app.request('http://localhost/bar')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>With Root</h1>')
  })

  it('Mustache template rendering with options', async () => {
    const res = await app.request('http://localhost/options')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>With Options</h1>')
  })
})
