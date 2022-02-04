import { Hono } from '../src/index'

describe('GET Request', () => {
  const app = new Hono()

  app.get('/hello', () => {
    return new Response('hello', {
      status: 200,
    })
  })

  app.get('/hello-with-shortcuts', (c) => {
    c.header('X-Custom', 'This is Hono')
    c.statusText('Hono is created')
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
    expect(await res.text()).toBe('hello')
  })

  it('GET /hell-with-shortcuts is ok', async () => {
    const req = new Request('http://localhost/hello-with-shortcuts')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(201)
    expect(res.statusText).toBe('Hono is created')
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

  it('Chained route', async () => {
    app
      .route('/route')
      .get(() => new Response('get /route'))
      .post(() => new Response('post /route'))
      .put(() => new Response('put /route'))
    let req = new Request('http://localhost/route', { method: 'GET' })
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /route')

    req = new Request('http://localhost/route', { method: 'POST' })
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('post /route')

    req = new Request('http://localhost/route', { method: 'DELETE' })
    res = await app.dispatch(req)
    expect(res.status).toBe(404)
  })

  it('Chained route without route method', async () => {
    app
      .get('/without-route', () => new Response('get /without-route'))
      .post(() => new Response('post /without-route'))
      .put(() => new Response('put /without-route'))

    let req = new Request('http://localhost/without-route', { method: 'GET' })
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /without-route')

    req = new Request('http://localhost/without-route', { method: 'POST' })
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('post /without-route')

    req = new Request('http://localhost/without-route', { method: 'DELETE' })
    res = await app.dispatch(req)
    expect(res.status).toBe(404)
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

describe('Custom 404', () => {
  const app = new Hono()

  app.notFound = () => {
    return new Response('Default 404 Nout Found', { status: 404 })
  }

  app.use('*', async (c, next) => {
    await next()
    if (c.res.status === 404) {
      c.res = new Response('Custom 404 Not Found', { status: 404 })
    }
  })

  app.get('/hello', () => {
    return new Response('hello')
  })

  it('Custom 404 Not Found', async () => {
    let req = new Request('http://localhost/hello')
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
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
    throw 'This is Error'
  })

  app.use('*', async (c, next) => {
    try {
      await next()
    } catch (err) {
      c.res = new Response('Custom Error Message', { status: 500 })
      c.res.headers.append('debug', String(err))
    }
  })

  it('Custom Error Message', async () => {
    const req = new Request('https://example.com/error')
    const res = await app.dispatch(req)
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Custom Error Message')
    expect(res.headers.get('debug')).toBe('This is Error')
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
