import { Hono } from '@/hono'
import { poweredBy } from '@/middleware/powered-by'

describe('GET Request', () => {
  const app = new Hono()

  app.get('/hello', () => {
    return new Response('hello', {
      status: 200,
      statusText: 'Hono is OK',
    })
  })

  app.get('/hello-with-shortcuts', (c) => {
    c.header('X-Custom', 'This is Hono')
    c.status(201)
    return c.html('<h1>Hono!!!</h1>')
  })

  it('GET /hello is ok', async () => {
    const res = await app.request('http://localhost/hello')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.statusText).toBe('Hono is OK')
    expect(await res.text()).toBe('hello')
  })

  it('GET /hell-with-shortcuts is ok', async () => {
    const res = await app.request('http://localhost/hello-with-shortcuts')
    expect(res).not.toBeNull()
    expect(res.status).toBe(201)
    expect(res.statusText).toBe('Created')
    expect(res.headers.get('X-Custom')).toBe('This is Hono')
    expect(res.headers.get('Content-Type')).toMatch(/text\/html/)
    expect(await res.text()).toBe('<h1>Hono!!!</h1>')
  })

  it('GET / is not found', async () => {
    const res = await app.request('http://localhost/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
    expect(res.statusText).toBe('Not Found')
  })
})

describe('strict parameter', () => {
  describe('strict is true with not slash', () => {
    const app = new Hono()

    app.get('/hello', (c) => {
      return c.text('/hello')
    })

    it('/hello/ is not found', async () => {
      let res = await app.request('http://localhost/hello')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      res = await app.request('http://localhost/hello/')
      expect(res).not.toBeNull()
      expect(res.status).toBe(404)
    })
  })

  describe('strict is true with slash', () => {
    const app = new Hono()

    app.get('/hello/', (c) => {
      return c.text('/hello/')
    })

    it('/hello is not found', async () => {
      let res = await app.request('http://localhost/hello/')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      res = await app.request('http://localhost/hello')
      expect(res).not.toBeNull()
      expect(res.status).toBe(404)
    })
  })

  describe('strict is false', () => {
    const app = new Hono({ strict: false })

    app.get('/hello', (c) => {
      return c.text('/hello')
    })

    it('/hello and /hello/ are treated as the same', async () => {
      let res = await app.request('http://localhost/hello')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      res = await app.request('http://localhost/hello/')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
    })
  })
})

describe('Routing', () => {
  const app = new Hono()

  it('Return it self', async () => {
    const appRes = app.get('/', () => new Response('get /'))
    expect(appRes).not.toBeUndefined()
    appRes.delete('/', () => new Response('delete /'))
    const res = await appRes.request('http://localhost/', { method: 'DELETE' })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('delete /')
  })

  it('Nested route', async () => {
    const book = app.route('/book')
    book.get('/', (c) => c.text('get /book'))
    book.get('/:id', (c) => {
      return c.text('get /book/' + c.req.param('id'))
    })
    book.post('/', (c) => c.text('post /book'))

    const user = app.route('/user')
    user.get('/login', (c) => c.text('get /user/login'))
    user.post('/register', (c) => c.text('post /user/register'))

    let res = await app.request('http://localhost/book', { method: 'GET' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /book')

    res = await app.request('http://localhost/book/123', { method: 'GET' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /book/123')

    res = await app.request('http://localhost/book', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('post /book')

    res = await app.request('http://localhost/book/', { method: 'GET' })
    expect(res.status).toBe(404)

    res = await app.request('http://localhost/user/login', { method: 'GET' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /user/login')

    res = await app.request('http://localhost/user/register', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('post /user/register')
  })
})

describe('param and query', () => {
  const app = new Hono()

  app.get('/entry/:id', (c) => {
    const id = c.req.param('id')
    return c.text(`id is ${id}`)
  })

  app.get('/search', (c) => {
    const name = c.req.query('name')
    return c.text(`name is ${name}`)
  })

  app.get('/add-header', (c) => {
    const bar = c.req.header('X-Foo')
    return c.text(`foo is ${bar}`)
  })

  it('param of /entry/:id is found', async () => {
    const res = await app.request('http://localhost/entry/123')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('id is 123')
  })

  it('query of /search?name=sam is found', async () => {
    const res = await app.request('http://localhost/search?name=sam')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('name is sam')
  })

  it('/add-header header - X-Foo is Bar', async () => {
    const req = new Request('http://localhost/add-header')
    req.headers.append('X-Foo', 'Bar')
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('foo is Bar')
  })
})

describe('Middleware', () => {
  const app = new Hono()

  // Custom Logger
  app.use('*', async (c, next) => {
    console.log(`${c.req.method} : ${c.req.url}`)
    await next()
  })

  // Append Custom Header
  app.use('*', async (c, next) => {
    await next()
    c.res.headers.append('x-custom', 'root')
  })

  app.use('/hello', async (c, next) => {
    await next()
    c.res.headers.append('x-message', 'custom-header')
  })

  app.use('/hello/*', async (c, next) => {
    await next()
    c.res.headers.append('x-message-2', 'custom-header-2')
  })

  app.get('/hello', (c) => {
    return c.text('hello')
  })
  app.get('/hello/:message', (c) => {
    const message = c.req.param('message')
    return c.text(`${message}`)
  })

  it('logging and custom header', async () => {
    const res = await app.request('http://localhost/hello')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
    expect(res.headers.get('x-custom')).toBe('root')
    expect(res.headers.get('x-message')).toBe('custom-header')
    expect(res.headers.get('x-message-2')).toBe('custom-header-2')
  })

  it('logging and custom header with named param', async () => {
    const res = await app.request('http://localhost/hello/message')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('message')
    expect(res.headers.get('x-custom')).toBe('root')
    expect(res.headers.get('x-message-2')).toBe('custom-header-2')
  })
})

describe('Not Found', () => {
  const app = new Hono()

  app.notFound((c) => {
    return c.text('Custom 404 Not Found', 404)
  })

  app.get('/hello', (c) => {
    return c.text('hello')
  })

  app.get('/notfound', (c) => {
    return c.notFound()
  })

  it('Custom 404 Not Found', async () => {
    let res = await app.request('http://localhost/hello')
    expect(res.status).toBe(200)
    res = await app.request('http://localhost/notfound')
    expect(res.status).toBe(404)
    res = await app.request('http://localhost/foo')
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('Custom 404 Not Found')
  })
})

describe('Redirect', () => {
  const app = new Hono()
  app.get('/redirect', (c) => {
    return c.redirect('/')
  })

  it('Absolute URL', async () => {
    const res = await app.request('https://example.com/redirect')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://example.com/')
  })
})

describe('Error handle', () => {
  const app = new Hono()

  app.get('/error', () => {
    throw new Error('This is Error')
  })

  app.use('/error-middleware', async () => {
    throw new Error('This is Middleware Error')
  })

  app.onError((err, c) => {
    c.header('x-debug', err.message)
    return c.text('Custom Error Message', 500)
  })

  it('Custom Error Message', async () => {
    let res = await app.request('https://example.com/error')
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Custom Error Message')
    expect(res.headers.get('x-debug')).toBe('This is Error')

    res = await app.request('https://example.com/error-middleware')
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Custom Error Message')
    expect(res.headers.get('x-debug')).toBe('This is Middleware Error')
  })
})

describe('Request methods with custom middleware', () => {
  const app = new Hono()

  app.use('*', async (c, next) => {
    const query = c.req.query('foo')
    const param = c.req.param('foo')
    const header = c.req.header('User-Agent')
    await next()
    c.header('X-Query-2', query)
    c.header('X-Param-2', param)
    c.header('X-Header-2', header)
  })

  app.get('/:foo', (c) => {
    const query = c.req.query('foo')
    const param = c.req.param('foo')
    const header = c.req.header('User-Agent')
    c.header('X-Query', query)
    c.header('X-Param', param)
    c.header('X-Header', header)
    return c.body('Hono')
  })

  it('query', async () => {
    const url = new URL('http://localhost/bar')
    url.searchParams.append('foo', 'bar')
    const req = new Request(url.toString())
    req.headers.append('User-Agent', 'bar')
    const res = await app.request(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('X-Query')).toBe('bar')
    expect(res.headers.get('X-Param')).toBe('bar')
    expect(res.headers.get('X-Header')).toBe('bar')

    expect(res.headers.get('X-Query-2')).toBe('bar')
    expect(res.headers.get('X-Param-2')).toBe('bar')
    expect(res.headers.get('X-Header-2')).toBe('bar')
  })
})
