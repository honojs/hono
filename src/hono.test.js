const fetch = require('node-fetch')
const { Hono } = require('./hono')

describe('GET Request', () => {
  const app = new Hono()

  app.get('/hello', () => {
    return new fetch.Response('hello', {
      status: 200,
    })
  })
  app.notFound = () => {
    return new fetch.Response('not found', {
      status: 404,
    })
  }
  it('GET /hello is ok', async () => {
    let req = new fetch.Request('https://example.com/hello')
    let res = await app.dispatch(req, new fetch.Response())
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
  })
  it('GET / is not found', async () => {
    let req = new fetch.Request('https://example.com/')
    let res = await app.dispatch(req, new fetch.Response())
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
  })
})

describe('params and query', () => {
  const app = new Hono()

  app.get('/entry/:id', async (c) => {
    const id = await c.req.params('id')
    return new fetch.Response(`id is ${id}`, {
      status: 200,
    })
  })

  app.get('/search', async (c) => {
    const name = await c.req.query('name')
    return new fetch.Response(`name is ${name}`, {
      status: 200,
    })
  })

  it('params of /entry/:id is found', async () => {
    let req = new fetch.Request('https://example.com/entry/123')
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('id is 123')
  })
  it('query of /search?name=sam is found', async () => {
    let req = new fetch.Request('https://example.com/search?name=sam')
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('name is sam')
  })
})

describe('Middleware', () => {
  const app = new Hono()

  const logger = async (c, next) => {
    console.log(`${c.req.method} : ${c.req.url}`)
    next()
  }

  const rootHeader = async (c, next) => {
    next()
    await c.res.headers.append('x-custom', 'root')
  }

  const customHeader = async (c, next) => {
    next()
    await c.res.headers.append('x-message', 'custom-header')
  }
  const customHeader2 = async (c, next) => {
    next()
    await c.res.headers.append('x-message-2', 'custom-header-2')
  }

  app.use('*', logger)
  app.use('*', rootHeader)
  app.use('/hello', customHeader)
  app.use('/hello/*', customHeader2)
  app.get('/hello', () => {
    return new fetch.Response('hello')
  })
  app.get('/hello/:message', (c) => {
    const message = c.req.params('message')
    return new fetch.Response(`${message}`)
  })

  it('logging and custom header', async () => {
    let req = new fetch.Request('https://example.com/hello')
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
    expect(await res.headers.get('x-custom')).toBe('root')
    expect(await res.headers.get('x-message')).toBe('custom-header')
    expect(await res.headers.get('x-message-2')).toBe('custom-header-2')
  })

  it('logging and custom header with named params', async () => {
    let req = new fetch.Request('https://example.com/hello/message')
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('message')
    expect(await res.headers.get('x-custom')).toBe('root')
    expect(await res.headers.get('x-message-2')).toBe('custom-header-2')
  })
})

describe('Custom 404', () => {
  const app = new Hono()

  const customNotFound = async (c, next) => {
    next()
    if (c.res.status === 404) {
      c.res = new fetch.Response('Custom 404 Not Found', { status: 404 })
    }
  }

  app.notFound = () => {
    return new fetch.Response('Default 404 Nout Found', { status: 404 })
  }

  app.use('*', customNotFound)
  app.get('/hello', () => {
    return new fetch.Response('hello')
  })
  it('Custom 404 Not Found', async () => {
    let req = new fetch.Request('https://example.com/hello')
    let res = await app.dispatch(req)
    expect(res.status).toBe(200)
    req = new fetch.Request('https://example.com/foo')
    res = await app.dispatch(req)
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('Custom 404 Not Found')
  })
})

describe('Error Handling', () => {
  const app = new Hono()

  it('Middleware must be async function', () => {
    const t = () => {
      throw new TypeError()
    }
    expect(t).toThrow(TypeError)

    const customNotFound = (c, next) => {
      next()
      if (c.res.status === 404) {
        c.res = new fetch.Response('Custom 404 Not Found', { status: 404 })
      }
    }

    expect(() => {
      app.use('*', customNotFound)
    }).toThrow(TypeError)
  })
})
