import { Hono } from './hono'

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

  app.notFound = () => {
    return new Response('not found', {
      status: 404,
    })
  }

  it('GET /hello is ok', async () => {
    const req = new Request('http://localhost/hello')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.statusText).toBe('Hono is OK')
    expect(await res.text()).toBe('hello')
  })

  it('GET /hell-with-shortcuts is ok', async () => {
    const req = new Request('http://localhost/hello-with-shortcuts')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(201)
    expect(res.statusText).toBe('Created')
    expect(res.headers.get('X-Custom')).toBe('This is Hono')
    expect(res.headers.get('Content-Type')).toMatch(/text\/html/)
    expect(await res.text()).toBe('<h1>Hono!!!</h1>')
  })

  it('GET / is not found', async () => {
    const req = new Request('http://localhost/')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
  })
})

describe('strict parameter', () => {
  describe('strict is true with not slash', () => {
    const app = new Hono()

    app.get('/hello', (c) => {
      return c.text('/hello')
    })

    it('/hello/ is not found', async () => {
      let req = new Request('http://localhost/hello')
      let res = await app.dispatch(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      req = new Request('http://localhost/hello/')
      res = await app.dispatch(req)
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
      let req = new Request('http://localhost/hello/')
      let res = await app.dispatch(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      req = new Request('http://localhost/hello')
      res = await app.dispatch(req)
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
      let req = new Request('http://localhost/hello')
      let res = await app.dispatch(req)
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      req = new Request('http://localhost/hello/')
      res = await app.dispatch(req)
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
    const req = new Request('http://localhost/', { method: 'DELETE' })
    const res = await appRes.dispatch(req)
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
    user.post('/regist', (c) => c.text('post /user/regist'))

    let req = new Request('http://localhost/book', { method: 'GET' })
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /book')

    req = new Request('http://localhost/book/123', { method: 'GET' })
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /book/123')

    req = new Request('http://localhost/book', { method: 'POST' })
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('post /book')

    req = new Request('http://localhost/book/', { method: 'GET' })
    res = await app.dispatch(req)
    expect(res.status).toBe(404)

    req = new Request('http://localhost/user/login', { method: 'GET' })
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /user/login')

    req = new Request('http://localhost/user/regist', { method: 'POST' })
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('post /user/regist')
  })
})

describe('param and query', () => {
  const app = new Hono()

  app.get('/entry/:id', (c) => {
    const id = c.req.param('id')
    return new Response(`id is ${id}`, {
      status: 200,
    })
  })

  app.get('/search', (c) => {
    const name = c.req.query('name')
    return new Response(`name is ${name}`, {
      status: 200,
    })
  })

  app.get('/add-header', (c) => {
    const bar = c.req.header('X-Foo')
    return new Response(`foo is ${bar}`, {
      status: 200,
    })
  })

  it('param of /entry/:id is found', async () => {
    const req = new Request('http://localhost/entry/123')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('id is 123')
  })

  it('query of /search?name=sam is found', async () => {
    const req = new Request('http://localhost/search?name=sam')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('name is sam')
  })

  it('/add-header header - X-Foo is Bar', async () => {
    const req = new Request('http://localhost/add-header')
    req.headers.append('X-Foo', 'Bar')
    const res = await app.dispatch(req)
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

  // Apeend Custom Header
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

  app.get('/hello', () => {
    return new Response('hello')
  })
  app.get('/hello/:message', (c) => {
    const message = c.req.param('message')
    return new Response(`${message}`)
  })

  it('logging and custom header', async () => {
    const req = new Request('http://localhost/hello')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
    expect(res.headers.get('x-custom')).toBe('root')
    expect(res.headers.get('x-message')).toBe('custom-header')
    expect(res.headers.get('x-message-2')).toBe('custom-header-2')
  })

  it('logging and custom header with named param', async () => {
    const req = new Request('http://localhost/hello/message')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('message')
    expect(res.headers.get('x-custom')).toBe('root')
    expect(res.headers.get('x-message-2')).toBe('custom-header-2')
  })
})

describe('404 Not Found', () => {
  const app = new Hono()

  app.notFound = (c) => {
    return c.text('Custom 404 Not Found', 404)
  }

  app.get('/hello', (c) => {
    return c.text('hello')
  })

  app.get('/notfound', (c) => {
    return c.notFound()
  })

  it('Custom 404 Not Found', async () => {
    let req = new Request('http://localhost/hello')
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    req = new Request('http://localhost/notfound')
    res = await app.dispatch(req)
    expect(res.status).toBe(404)
    req = new Request('http://localhost/foo')
    res = await app.dispatch(req)
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
    const req = new Request('https://example.com/redirect')
    const res = await app.dispatch(req)
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

  app.onError = (err, c) => {
    c.header('debug', err.message)
    return c.text('Custom Error Message', 500)
  }

  it('Custom Error Message', async () => {
    let req = new Request('https://example.com/error')
    let res = await app.dispatch(req)
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Custom Error Message')
    expect(res.headers.get('debug')).toBe('This is Error')

    req = new Request('https://example.com/error-middleware')
    res = await app.dispatch(req)
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Custom Error Message')
    expect(res.headers.get('debug')).toBe('This is Middleware Error')
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
    const res = await app.dispatch(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('X-Query')).toBe('bar')
    expect(res.headers.get('X-Param')).toBe('bar')
    expect(res.headers.get('X-Header')).toBe('bar')

    expect(res.headers.get('X-Query-2')).toBe('bar')
    expect(res.headers.get('X-Param-2')).toBe('bar')
    expect(res.headers.get('X-Header-2')).toBe('bar')
  })
})
