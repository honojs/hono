import { Hono } from '../../hono'
import type { MiddlewareHandler } from '../../types'
import { every, except, some } from '.'

const nextMiddleware: MiddlewareHandler = async (_, next) => await next()

describe('some', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
  })

  it('Should call only the first middleware', async () => {
    const middleware1 = vi.fn(nextMiddleware)
    const middleware2 = vi.fn(nextMiddleware)

    app.use('/', some(middleware1, middleware2))
    app.get('/', (c) => {
      return c.text('Hello World')
    })
    const res = await app.request('http://localhost/')

    expect(middleware1).toBeCalled()
    expect(middleware2).not.toBeCalled()
    expect(await res.text()).toBe('Hello World')
  })

  it('Should try to call the second middleware if the first one throws an error', async () => {
    const middleware1 = () => {
      throw new Error('Error')
    }
    const middleware2 = vi.fn(nextMiddleware)

    app.use('/', some(middleware1, middleware2))
    app.get('/', (c) => {
      return c.text('Hello World')
    })
    const res = await app.request('http://localhost/')

    expect(middleware2).toBeCalled()
    expect(await res.text()).toBe('Hello World')
  })

  it('Should try to call the second middleware if the first one returns false', async () => {
    const middleware1 = () => false
    const middleware2 = vi.fn(nextMiddleware)

    app.use('/', some(middleware1, middleware2))
    app.get('/', (c) => {
      return c.text('Hello World')
    })
    const res = await app.request('http://localhost/')

    expect(middleware2).toBeCalled()
    expect(await res.text()).toBe('Hello World')
  })

  it('Should throw last error if all middleware throw an error', async () => {
    const middleware1 = () => {
      throw new Error('Error1')
    }
    const middleware2 = () => {
      throw new Error('Error2')
    }

    app.use('/', some(middleware1, middleware2))
    app.get('/', (c) => {
      return c.text('Hello World')
    })
    app.onError((error, c) => {
      return c.text(error.message)
    })
    const res = await app.request('http://localhost/')

    expect(await res.text()).toBe('Error2')
  })

  it('Should throw error if all middleware return false', async () => {
    const middleware1 = () => false
    const middleware2 = () => false

    app.use('/', some(middleware1, middleware2))
    app.get('/', (c) => {
      return c.text('Hello World')
    })
    app.onError((_, c) => {
      return c.text('oops')
    })
    const res = await app.request('http://localhost/')

    expect(await res.text()).toBe('oops')
  })
})

describe('every', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
  })

  it('Should call all middleware', async () => {
    const middleware1 = vi.fn(nextMiddleware)
    const middleware2 = vi.fn(nextMiddleware)

    app.use('/', every(middleware1, middleware2))
    app.get('/', (c) => {
      return c.text('Hello World')
    })
    const res = await app.request('http://localhost/')

    expect(middleware1).toBeCalled()
    expect(middleware2).toBeCalled()
    expect(await res.text()).toBe('Hello World')
  })

  it('Should throw error if any middleware throws an error', async () => {
    const middleware1 = () => {
      throw new Error('Error1')
    }
    const middleware2 = vi.fn(nextMiddleware)

    app.use('/', every(middleware1, middleware2))
    app.get('/', (c) => {
      return c.text('Hello World')
    })
    app.onError((error, c) => {
      return c.text(error.message)
    })
    const res = await app.request('http://localhost/')

    expect(await res.text()).toBe('Error1')
    expect(middleware2).not.toBeCalled()
  })

  it('Should throw error if any middleware returns false', async () => {
    const middleware1 = () => false
    const middleware2 = vi.fn(nextMiddleware)

    app.use('/', every(middleware1, middleware2))
    app.get('/', (c) => {
      return c.text('Hello World')
    })
    app.onError((_, c) => {
      return c.text('oops')
    })
    const res = await app.request('http://localhost/')

    expect(await res.text()).toBe('oops')
    expect(middleware2).not.toBeCalled()
  })

  it('Should return the same response a middleware returns if it short-circuits the chain', async () => {
    const middleware1: MiddlewareHandler = async (c) => {
      return c.text('Hello Middleware 1')
    }
    const middleware2 = vi.fn(nextMiddleware)

    app.use('/', every(middleware1, middleware2))
    app.get('/', (c) => {
      return c.text('Hello World')
    })
    const res = await app.request('http://localhost/')

    expect(await res.text()).toBe('Hello Middleware 1')
    expect(middleware2).not.toBeCalled()
  })

  it('Should pass the path params to middlewares', async () => {
    const app = new Hono()
    app.use('*', nextMiddleware)
    const paramMiddleware: MiddlewareHandler = async (c) => {
      return c.json(c.req.param(), 200)
    }

    app.use('/:id', every(paramMiddleware))
    app.get('/:id', (c) => {
      return c.text('Hello World')
    })

    const res = await app.request('http://localhost/123')
    expect(await res.json()).toEqual({ id: '123' })
  })
})

describe('except', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
  })

  it('Should call all middleware, except the one that matches the condition', async () => {
    const middleware1 = vi.fn(nextMiddleware)
    const middleware2 = vi.fn(nextMiddleware)

    app.use('*', except('/maintenance', middleware1, middleware2))
    app.get('/maintenance', (c) => {
      return c.text('Hello Maintenance')
    })
    app.get('*', (c) => {
      return c.redirect('/maintenance')
    })
    let res = await app.request('http://localhost/')

    expect(middleware1).toBeCalled()
    expect(middleware2).toBeCalled()
    expect(res.headers.get('location')).toBe('/maintenance')

    middleware1.mockClear()
    middleware2.mockClear()
    res = await app.request('http://localhost/maintenance')

    expect(middleware1).not.toBeCalled()
    expect(middleware2).not.toBeCalled()
    expect(await res.text()).toBe('Hello Maintenance')
  })

  it('Should call all middleware, except the one that matches some of the conditions', async () => {
    const middleware1 = vi.fn(nextMiddleware)
    const middleware2 = vi.fn(nextMiddleware)

    app.use('*', except(['/maintenance', '/public/users/:id'], middleware1, middleware2))
    app.get('/maintenance', (c) => {
      return c.text('Hello Maintenance')
    })
    app.get('/public/users/:id', (c) => {
      return c.text(`Hello Public User ${c.req.param('id')}`)
    })
    app.get('/secret', (c) => {
      return c.text('Hello Secret')
    })
    let res = await app.request('http://localhost/secret')

    expect(middleware1).toBeCalled()
    expect(middleware2).toBeCalled()
    expect(await res.text()).toBe('Hello Secret')

    middleware1.mockClear()
    middleware2.mockClear()
    res = await app.request('http://localhost/maintenance')

    expect(middleware1).not.toBeCalled()
    expect(middleware2).not.toBeCalled()
    expect(await res.text()).toBe('Hello Maintenance')

    middleware1.mockClear()
    middleware2.mockClear()
    res = await app.request('http://localhost/public/users/123')

    expect(middleware1).not.toBeCalled()
    expect(middleware2).not.toBeCalled()
    expect(await res.text()).toBe('Hello Public User 123')
  })

  it('Should call all middleware, except the one that matches some of the condition function', async () => {
    const middleware1 = vi.fn(nextMiddleware)
    const middleware2 = vi.fn(nextMiddleware)

    app.use(
      '*',
      except(['/maintenance', (c) => !!c.req.path.match(/public/)], middleware1, middleware2)
    )
    app.get('/maintenance', (c) => {
      return c.text('Hello Maintenance')
    })
    app.get('/public/users/:id', (c) => {
      return c.text(`Hello Public User ${c.req.param('id')}`)
    })
    app.get('/secret', (c) => {
      return c.text('Hello Secret')
    })
    let res = await app.request('http://localhost/secret')

    expect(middleware1).toBeCalled()
    expect(middleware2).toBeCalled()
    expect(await res.text()).toBe('Hello Secret')

    middleware1.mockClear()
    middleware2.mockClear()
    res = await app.request('http://localhost/maintenance')

    expect(middleware1).not.toBeCalled()
    expect(middleware2).not.toBeCalled()
    expect(await res.text()).toBe('Hello Maintenance')

    middleware1.mockClear()
    middleware2.mockClear()
    res = await app.request('http://localhost/public/users/123')

    expect(middleware1).not.toBeCalled()
    expect(middleware2).not.toBeCalled()
    expect(await res.text()).toBe('Hello Public User 123')
  })
})
