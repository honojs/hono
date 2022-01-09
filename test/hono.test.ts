import makeServiceWorkerEnv from 'service-worker-mock'
import { Hono } from '../src/hono'

declare let global: any
Object.assign(global, makeServiceWorkerEnv())

describe('GET Request', () => {
  const app = new Hono()
  app.get('/hello', () => {
    return new Response('hello', {
      status: 200,
    })
  })
  app.notFound = () => {
    return new Response('not found', {
      status: 404,
    })
  }
  it('GET /hello is ok', async () => {
    const req = new Request('/hello')
    const res = await app.dispatch(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
  })
  it('GET / is not found', async () => {
    const req = new Request('/')
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
    const req = new Request('/', { method: 'DELETE' })
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
    let req = new Request('/route', { method: 'GET' })
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /route')

    req = new Request('/route', { method: 'POST' })
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('post /route')

    req = new Request('/route', { method: 'DELETE' })
    res = await app.dispatch(req)
    expect(res.status).toBe(404)
  })

  it('Chained route without route method', async () => {
    app
      .get('/without-route', () => new Response('get /without-route'))
      .post(() => new Response('post /without-route'))
      .put(() => new Response('put /without-route'))

    let req = new Request('/without-route', { method: 'GET' })
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /without-route')

    req = new Request('/without-route', { method: 'POST' })
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('post /without-route')

    req = new Request('/without-route', { method: 'DELETE' })
    res = await app.dispatch(req)
    expect(res.status).toBe(404)
  })
})

describe('params and query', () => {
  const app = new Hono()

  app.get('/entry/:id', async (c) => {
    const id = await c.req.params('id')
    return new Response(`id is ${id}`, {
      status: 200,
    })
  })

  app.get('/search', async (c) => {
    const name = await c.req.query('name')
    return new Response(`name is ${name}`, {
      status: 200,
    })
  })

  it('params of /entry/:id is found', async () => {
    const req = new Request('/entry/123')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('id is 123')
  })
  it('query of /search?name=sam is found', async () => {
    const req = new Request('/search?name=sam')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('name is sam')
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
    await c.res.headers.append('x-custom', 'root')
  })

  app.use('/hello', async (c, next) => {
    await next()
    await c.res.headers.append('x-message', 'custom-header')
  })

  app.use('/hello/*', async (c, next) => {
    await next()
    await c.res.headers.append('x-message-2', 'custom-header-2')
  })

  app.get('/hello', () => {
    return new Response('hello')
  })
  app.get('/hello/:message', (c) => {
    const message = c.req.params('message')
    return new Response(`${message}`)
  })

  it('logging and custom header', async () => {
    const req = new Request('/hello')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
    expect(await res.headers.get('x-custom')).toBe('root')
    expect(await res.headers.get('x-message')).toBe('custom-header')
    expect(await res.headers.get('x-message-2')).toBe('custom-header-2')
  })

  it('logging and custom header with named params', async () => {
    const req = new Request('/hello/message')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('message')
    expect(await res.headers.get('x-custom')).toBe('root')
    expect(await res.headers.get('x-message-2')).toBe('custom-header-2')
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
    let req = new Request('/hello')
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    req = new Request('/foo')
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
    expect(await res.headers.get('Location')).toBe('https://example.com/')
  })
})
