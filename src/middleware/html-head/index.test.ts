import { Hono } from '../../hono'
import { htmlHead } from '.'

describe('htmlHead middleware', () => {
  it('Should inject static head tag', async () => {
    const app = new Hono()
    app.use('/', htmlHead('<meta name="description" content="test">'))
    app.get('/', (c) => c.html('<html><head></head><body>Hello World!</body></html>'))
    const res = await app.request('/')
    expect(await res.text()).toBe(
      '<html><head><meta name="description" content="test"></head><body>Hello World!</body></html>'
    )
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
  })
  it('Should inject dynamic head tag', async () => {
    const app = new Hono()
    app.use(
      '/',
      htmlHead((c) => {
        const title = c.req.query('title') || 'Default Title'
        return `<meta name="description" content="${title}">`
      })
    )
    app.get('/', (c) => c.html('<html><head></head><body>Hello World!</body></html>'))
    const res = await app.request('/?title=Test')
    expect(await res.text()).toBe(
      '<html><head><meta name="description" content="Test"></head><body>Hello World!</body></html>'
    )
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
  })
  it('Should not inject head tag if content type is not text/html', async () => {
    const app = new Hono()
    app.use('/', htmlHead('<meta name="description" content="test">'))
    app.get('/', (c) => c.text('Hello World!'))
    const res = await app.request('/')
    expect(await res.text()).toBe('Hello World!')
  })
  it('Should not inject head tag if response body is null', async () => {
    const app = new Hono()
    app.use('/', htmlHead('<meta name="description" content="test">'))
    app.get('/', (c) => c.body(null))
    const res = await app.request('/')
    expect(res.body).toBeNull()
  })
  it('Should inject head tag when using static head tag if no head is provided', async () => {
    const app = new Hono()
    app.use('/', htmlHead('head content'))
    app.get('/', (c) => c.html('aaa'))
    const res = await app.request('/')
    expect(await res.text()).toBe('<head>head content</head>aaa')
  })
  it('Should inject head tag when using dynamic head tag if no head is provided', async () => {
    const app = new Hono()
    app.use(
      '/',
      htmlHead(() => 'head content')
    )
    app.get('/', (c) => c.html('aaa'))
    const res = await app.request('/')
    expect(await res.text()).toBe('<head>head content</head>aaa')
  })
})
