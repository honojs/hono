/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { expectTypeOf } from 'vitest'
import { hc } from './client'
import type { Context } from './context'
import { Hono } from './hono'
import { HTTPException } from './http-exception'
import { logger } from './middleware/logger'
import { poweredBy } from './middleware/powered-by'
import { SmartRouter } from './mod'
import { RegExpRouter } from './router/reg-exp-router'
import { TrieRouter } from './router/trie-router'
import type { Handler, MiddlewareHandler, Next } from './types'
import type { Expect, Equal } from './utils/types'
import { getPath } from './utils/url'

// https://stackoverflow.com/a/65666402
function throwExpression(errorMessage: string): never {
  throw new Error(errorMessage)
}

describe('GET Request', () => {
  describe('without middleware', () => {
    // In other words, this is a test for cases that do not use `compose()`

    const app = new Hono()

    app.get('/hello', async () => {
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

    app.get('/hello-env', (c) => {
      return c.json(c.env)
    })

    app.get(
      '/proxy-object',
      () =>
        new Proxy(new Response('proxy'), {
          get(target, prop: keyof Response) {
            return target[prop]
          },
        })
    )

    app.get(
      '/async-proxy-object',
      async () =>
        new Proxy(new Response('proxy'), {
          get(target, prop: keyof Response) {
            return target[prop]
          },
        })
    )

    it('GET http://localhost/hello is ok', async () => {
      const res = await app.request('http://localhost/hello')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(res.statusText).toBe('Hono is OK')
      expect(await res.text()).toBe('hello')
    })

    it('GET httphello is ng', async () => {
      const res = await app.request('httphello')
      expect(res.status).toBe(404)
    })

    it('GET /hello is ok', async () => {
      const res = await app.request('/hello')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(res.statusText).toBe('Hono is OK')
      expect(await res.text()).toBe('hello')
    })

    it('GET hello is ok', async () => {
      const res = await app.request('hello')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(res.statusText).toBe('Hono is OK')
      expect(await res.text()).toBe('hello')
    })

    it('GET /hello-with-shortcuts is ok', async () => {
      const res = await app.request('http://localhost/hello-with-shortcuts')
      expect(res).not.toBeNull()
      expect(res.status).toBe(201)
      expect(res.headers.get('X-Custom')).toBe('This is Hono')
      expect(res.headers.get('Content-Type')).toMatch(/text\/html/)
      expect(await res.text()).toBe('<h1>Hono!!!</h1>')
    })

    it('GET / is not found', async () => {
      const res = await app.request('http://localhost/')
      expect(res).not.toBeNull()
      expect(res.status).toBe(404)
    })

    it('GET /hello-env is ok', async () => {
      const res = await app.request('/hello-env', undefined, { HELLO: 'world' })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ HELLO: 'world' })
    })

    it('GET /proxy-object is ok', async () => {
      const res = await app.request('/proxy-object')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('proxy')
    })

    it('GET /async-proxy-object is ok', async () => {
      const res = await app.request('/proxy-object')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('proxy')
    })
  })

  describe('with middleware', () => {
    // when using `compose()`

    const app = new Hono()

    app.use('*', async (ctx, next) => {
      await next()
    })

    app.get('/hello', async () => {
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

    app.get('/hello-env', (c) => {
      return c.json(c.env)
    })

    app.get(
      '/proxy-object',
      () =>
        new Proxy(new Response('proxy'), {
          get(target, prop: keyof Response) {
            return target[prop]
          },
        })
    )

    app.get(
      '/async-proxy-object',
      async () =>
        new Proxy(new Response('proxy'), {
          get(target, prop: keyof Response) {
            return target[prop]
          },
        })
    )

    it('GET http://localhost/hello is ok', async () => {
      const res = await app.request('http://localhost/hello')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(res.statusText).toBe('Hono is OK')
      expect(await res.text()).toBe('hello')
    })

    it('GET httphello is ng', async () => {
      const res = await app.request('httphello')
      expect(res.status).toBe(404)
    })

    it('GET /hello is ok', async () => {
      const res = await app.request('/hello')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(res.statusText).toBe('Hono is OK')
      expect(await res.text()).toBe('hello')
    })

    it('GET hello is ok', async () => {
      const res = await app.request('hello')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(res.statusText).toBe('Hono is OK')
      expect(await res.text()).toBe('hello')
    })

    it('GET /hello-with-shortcuts is ok', async () => {
      const res = await app.request('http://localhost/hello-with-shortcuts')
      expect(res).not.toBeNull()
      expect(res.status).toBe(201)
      expect(res.headers.get('X-Custom')).toBe('This is Hono')
      expect(res.headers.get('Content-Type')).toMatch(/text\/html/)
      expect(await res.text()).toBe('<h1>Hono!!!</h1>')
    })

    it('GET / is not found', async () => {
      const res = await app.request('http://localhost/')
      expect(res).not.toBeNull()
      expect(res.status).toBe(404)
    })

    it('GET /hello-env is ok', async () => {
      const res = await app.request('/hello-env', undefined, { HELLO: 'world' })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ HELLO: 'world' })
    })

    it('GET /proxy-object is ok', async () => {
      const res = await app.request('/proxy-object')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('proxy')
    })

    it('GET /async-proxy-object is ok', async () => {
      const res = await app.request('/proxy-object')
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('proxy')
    })
  })
})

describe('Register handlers without a path', () => {
  describe('No basePath', () => {
    const app = new Hono()

    app.get((c) => {
      return c.text('Hello')
    })

    it('GET http://localhost/ is ok', async () => {
      const res = await app.request('/')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Hello')
    })

    it('GET http://localhost/anything is ok', async () => {
      const res = await app.request('/')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Hello')
    })
  })

  describe('With specifying basePath', () => {
    const app = new Hono().basePath('/about')

    app.get((c) => {
      return c.text('About')
    })

    it('GET http://localhost/about is ok', async () => {
      const res = await app.request('/about')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('About')
    })

    it('GET http://localhost/ is not found', async () => {
      const res = await app.request('/')
      expect(res.status).toBe(404)
    })
  })

  describe('With chaining', () => {
    const app = new Hono()

    app.post('/books').get((c) => {
      return c.text('Books')
    })

    it('GET http://localhost/books is ok', async () => {
      const res = await app.request('/books')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Books')
    })

    it('GET http://localhost/ is not found', async () => {
      const res = await app.request('/')
      expect(res.status).toBe(404)
    })
  })
})

describe('router option', () => {
  it('Should be SmartRouter', () => {
    const app = new Hono()
    expect(app.router instanceof SmartRouter).toBe(true)
  })
  it('Should be RegExpRouter', () => {
    const app = new Hono({
      router: new RegExpRouter(),
    })
    expect(app.router instanceof RegExpRouter).toBe(true)
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

  describe('strict is false with `getPath` option', () => {
    const app = new Hono({
      strict: false,
      getPath: getPath,
    })

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

describe('Destruct functions in context', () => {
  it('Should return 200 response - text', async () => {
    const app = new Hono()
    app.get('/text', ({ text }) => text('foo'))
    const res = await app.request('http://localhost/text')
    expect(res.status).toBe(200)
  })
  it('Should return 200 response - json', async () => {
    const app = new Hono()
    app.get('/json', ({ json }) => json({ foo: 'bar' }))
    const res = await app.request('http://localhost/json')
    expect(res.status).toBe(200)
  })
})

describe('Routing', () => {
  it('Return it self', async () => {
    const app = new Hono()

    const app2 = app.get('/', () => new Response('get /'))
    expect(app2).not.toBeUndefined()
    app2.delete('/', () => new Response('delete /'))

    let res = await app2.request('http://localhost/', { method: 'GET' })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /')

    res = await app2.request('http://localhost/', { method: 'DELETE' })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('delete /')
  })

  it('Nested route', async () => {
    const app = new Hono()

    const book = app.basePath('/book')
    book.get('/', (c) => c.text('get /book'))
    book.get('/:id', (c) => {
      return c.text('get /book/' + c.req.param('id'))
    })
    book.post('/', (c) => c.text('post /book'))

    const user = app.basePath('/user')
    user.get('/login', (c) => c.text('get /user/login'))
    user.post('/register', (c) => c.text('post /user/register'))

    const appForEachUser = user.basePath(':id')
    appForEachUser.get('/profile', (c) => c.text('get /user/' + c.req.param('id') + '/profile'))

    app.get('/add-path-after-route-call', (c) => c.text('get /add-path-after-route-call'))

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

    res = await app.request('http://localhost/user/123/profile', { method: 'GET' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /user/123/profile')

    res = await app.request('http://localhost/add-path-after-route-call', { method: 'GET' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /add-path-after-route-call')
  })

  it('Nested route - subApp with basePath', async () => {
    const app = new Hono()
    const book = new Hono().basePath('/book')
    book.get('/', (c) => c.text('get /book'))
    app.route('/api', book)

    const res = await app.request('http://localhost/api/book', { method: 'GET' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /book')
  })

  it('Multiple route', async () => {
    const app = new Hono()

    const book = new Hono()
    book.get('/hello', (c) => c.text('get /book/hello'))

    const user = new Hono()
    user.get('/hello', (c) => c.text('get /user/hello'))

    app.route('/book', book).route('/user', user)

    let res = await app.request('http://localhost/book/hello', { method: 'GET' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /book/hello')

    res = await app.request('http://localhost/user/hello', { method: 'GET' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('get /user/hello')
  })

  describe('Nested route with middleware', () => {
    const api = new Hono()
    const api2 = api.use('*', async (_c, next) => await next())

    it('Should mount routes with no type errors', () => {
      const app = new Hono().route('/api', api2)
    })
  })

  describe('Grouped route', () => {
    let one: Hono, two: Hono, three: Hono

    beforeEach(() => {
      one = new Hono()
      two = new Hono()
      three = new Hono()
    })

    it('only works with correct order', async () => {
      three.get('/hi', (c) => c.text('hi'))
      two.route('/three', three)
      one.route('/two', two)

      const { status } = await one.request('http://localhost/two/three/hi', { method: 'GET' })
      expect(status).toBe(200)
    })

    it('fails with incorrect order 1', async () => {
      three.get('/hi', (c) => c.text('hi'))
      one.route('/two', two)
      two.route('/three', three)

      const { status } = await one.request('http://localhost/two/three/hi', { method: 'GET' })
      expect(status).toBe(404)
    })

    it('fails with incorrect order 2', async () => {
      two.route('/three', three)
      three.get('/hi', (c) => c.text('hi'))
      one.route('/two', two)

      const { status } = await one.request('http://localhost/two/three/hi', { method: 'GET' })
      expect(status).toBe(404)
    })

    it('fails with incorrect order 3', async () => {
      two.route('/three', three)
      one.route('/two', two)
      three.get('/hi', (c) => c.text('hi'))

      const { status } = await one.request('http://localhost/two/three/hi', { method: 'GET' })
      expect(status).toBe(404)
    })

    it('fails with incorrect order 4', async () => {
      one.route('/two', two)
      three.get('/hi', (c) => c.text('hi'))
      two.route('/three', three)

      const { status } = await one.request('http://localhost/two/three/hi', { method: 'GET' })
      expect(status).toBe(404)
    })

    it('fails with incorrect order 5', async () => {
      one.route('/two', two)
      two.route('/three', three)
      three.get('/hi', (c) => c.text('hi'))

      const { status } = await one.request('http://localhost/two/three/hi', { method: 'GET' })
      expect(status).toBe(404)
    })
  })

  it('routing with hostname', async () => {
    const app = new Hono({
      getPath: (req) => req.url.replace(/^https?:\/(.+?)$/, '$1'),
    })

    const sub = new Hono()
    sub.get('/', (c) => c.text('hello sub'))
    sub.get('/foo', (c) => c.text('hello sub foo'))

    app.get('/www1.example.com/hello', () => new Response('hello www1'))
    app.get('/www2.example.com/hello', () => new Response('hello www2'))

    app.get('/www1.example.com/', (c) => c.text('hello www1 root'))
    app.route('/www1.example.com/sub', sub)

    let res = await app.request('http://www1.example.com/hello')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello www1')

    res = await app.request('http://www2.example.com/hello')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello www2')

    res = await app.request('http://www1.example.com/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello www1 root')

    res = await app.request('http://www1.example.com/sub')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello sub')

    res = await app.request('http://www1.example.com/sub/foo')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello sub foo')
  })

  it('routing with request header', async () => {
    const app = new Hono({
      getPath: (req) =>
        '/' + req.headers.get('host') + req.url.replace(/^https?:\/\/[^/]+(\/[^?]*)/, '$1'),
    })

    const sub = new Hono()
    sub.get('/', (c) => c.text('hello sub'))
    sub.get('/foo', (c) => c.text('hello sub foo'))

    app.get('/www1.example.com/hello', () => new Response('hello www1'))
    app.get('/www2.example.com/hello', () => new Response('hello www2'))

    app.get('/www1.example.com/', (c) => c.text('hello www1 root'))
    app.route('/www1.example.com/sub', sub)

    let res = await app.request('http://www1.example.com/hello', {
      headers: {
        host: 'www1.example.com',
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello www1')

    res = await app.request('http://www2.example.com/hello', {
      headers: {
        host: 'www2.example.com',
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello www2')

    res = await app.request('http://www1.example.com/', {
      headers: {
        host: 'www1.example.com',
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello www1 root')

    res = await app.request('http://www1.example.com/sub', {
      headers: {
        host: 'www1.example.com',
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello sub')

    res = await app.request('http://www1.example.com/sub/foo', {
      headers: {
        host: 'www1.example.com',
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello sub foo')
    expect(res.status).toBe(200)
  })

  describe('routing with the bindings value', () => {
    const app = new Hono<{ Bindings: { host: string } }>({
      getPath: (req, options) => {
        const url = new URL(req.url)
        const host = options?.env?.host
        const prefix = url.host === host ? '/FOO' : ''
        return url.pathname === '/' ? prefix : `${prefix}${url.pathname}`
      },
    })

    app.get('/about', (c) => c.text('About root'))
    app.get('/FOO/about', (c) => c.text('About FOO'))

    it('Should return 200 without specifying a hostname', async () => {
      const res = await app.request('/about')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('About root')
    })

    it('Should return 200 with specifying the hostname in env', async () => {
      const req = new Request('http://foo.localhost/about')
      const res = await app.fetch(req, { host: 'foo.localhost' })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('About FOO')
    })
  })

  describe('Chained route', () => {
    const app = new Hono()

    app
      .get('/chained/:abc', (c) => {
        const abc = c.req.param('abc')
        return c.text(`GET for ${abc}`)
      })
      .post((c) => {
        const abc = c.req.param('abc')
        return c.text(`POST for ${abc}`)
      })
    it('Should return 200 response from GET request', async () => {
      const res = await app.request('http://localhost/chained/abc', { method: 'GET' })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('GET for abc')
    })
    it('Should return 200 response from POST request', async () => {
      const res = await app.request('http://localhost/chained/abc', { method: 'POST' })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('POST for abc')
    })
    it('Should return 404 response from PUT request', async () => {
      const res = await app.request('http://localhost/chained/abc', { method: 'PUT' })
      expect(res.status).toBe(404)
    })
  })
})

describe('param and query', () => {
  const apps: Record<string, Hono> = {}
  apps['get by name'] = (() => {
    const app = new Hono()

    app.get('/entry/:id', (c) => {
      const id = c.req.param('id')
      return c.text(`id is ${id}`)
    })

    app.get('/date/:date{[0-9]+}', (c) => {
      const date = c.req.param('date')
      return c.text(`date is ${date}`)
    })

    app.get('/search', (c) => {
      const name = c.req.query('name')
      return c.text(`name is ${name}`)
    })

    app.get('/multiple-values', (c) => {
      const queries = c.req.queries('q') ?? throwExpression('missing query values')
      const limit = c.req.queries('limit') ?? throwExpression('missing query values')
      return c.text(`q is ${queries[0]} and ${queries[1]}, limit is ${limit[0]}`)
    })

    app.get('/add-header', (c) => {
      const bar = c.req.header('X-Foo')
      return c.text(`foo is ${bar}`)
    })

    return app
  })()

  apps['get all as an object'] = (() => {
    const app = new Hono()

    app.get('/entry/:id', (c) => {
      const { id } = c.req.param()
      return c.text(`id is ${id}`)
    })

    app.get('/date/:date{[0-9]+}', (c) => {
      const { date } = c.req.param()
      return c.text(`date is ${date}`)
    })

    app.get('/search', (c) => {
      const { name } = c.req.query()
      return c.text(`name is ${name}`)
    })

    app.get('/multiple-values', (c) => {
      const { q, limit } = c.req.queries()
      return c.text(`q is ${q[0]} and ${q[1]}, limit is ${limit[0]}`)
    })

    app.get('/add-header', (c) => {
      const { 'x-foo': bar } = c.req.header()
      return c.text(`foo is ${bar}`)
    })

    return app
  })()

  describe.each(Object.keys(apps))('%s', (name) => {
    const app = apps[name]

    it('param of /entry/:id is found', async () => {
      const res = await app.request('http://localhost/entry/123')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('id is 123')
    })

    it('param of /entry/:id is found, even for Array object method names', async () => {
      const res = await app.request('http://localhost/entry/key')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('id is key')
    })

    it('param of /entry/:id is decoded', async () => {
      const res = await app.request('http://localhost/entry/%C3%A7awa%20y%C3%AE%3F')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('id is çawa yî?')
    })

    it('param of /date/:date is found', async () => {
      const res = await app.request('http://localhost/date/0401')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('date is 0401')
    })

    it('query of /search?name=sam is found', async () => {
      const res = await app.request('http://localhost/search?name=sam')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('name is sam')
    })

    it('query of /search?name=sam&name=tom is found', async () => {
      const res = await app.request('http://localhost/search?name=sam&name=tom')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('name is sam')
    })

    it('query of /multiple-values?q=foo&q=bar&limit=10 is found', async () => {
      const res = await app.request('http://localhost/multiple-values?q=foo&q=bar&limit=10')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('q is foo and bar, limit is 10')
    })

    it('/add-header header - X-Foo is Bar', async () => {
      const req = new Request('http://localhost/add-header')
      req.headers.append('X-Foo', 'Bar')
      const res = await app.request(req)
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('foo is Bar')
    })
  })

  describe('param with undefined', () => {
    const app = new Hono()
    app.get('/foo/:foo', (c) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      /* @ts-ignore */
      const bar = c.req.param('bar')
      return c.json({ foo: bar })
    })
    it('param of /foo/foo should return undefined not "undefined"', async () => {
      const res = await app.request('http://localhost/foo/foo')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ foo: undefined })
    })
  })
})

describe('c.req.path', () => {
  const app = new Hono()
  app.get('/', (c) => c.text(c.req.path))
  app.get('/search', (c) => c.text(c.req.path))

  it('Should get the path `/` correctly', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/')
  })

  it('Should get the path `/search` correctly with a query', async () => {
    const res = await app.request('/search?query=hono')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/search')
  })
})

describe('Header', () => {
  const app = new Hono()

  app.get('/text', (c) => {
    return c.text('Hello')
  })

  app.get('/text-with-custom-header', (c) => {
    c.header('X-Custom', 'Message')
    return c.text('Hello')
  })

  it('Should return correct headers - /text', async () => {
    const res = await app.request('/text')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(await res.text()).toBe('Hello')
  })

  it('Should return correct headers - /text-with-custom-header', async () => {
    const res = await app.request('/text-with-custom-header')
    expect(res.status).toBe(200)
    expect(res.headers.get('x-custom')).toBe('Message')
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(await res.text()).toBe('Hello')
  })
})

describe('Middleware', () => {
  describe('Basic', () => {
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

    app.use('/json/*', async (c, next) => {
      c.res.headers.append('foo', 'bar')
      await next()
    })

    app.get('/json', (c) => {
      // With a raw response
      return new Response(
        JSON.stringify({
          message: 'hello',
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
        }
      )
    })

    app.get('/hello/:message', (c) => {
      const message = c.req.param('message')
      return c.text(`${message}`)
    })

    app.get('/error', () => {
      throw new Error('Error!')
    })

    app.notFound((c) => {
      return c.text('Not Found Foo', 404)
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

    it('should return correct the content-type header', async () => {
      const res = await app.request('http://localhost/json')
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toMatch(/^application\/json/)
    })

    it('not found', async () => {
      const res = await app.request('http://localhost/foo')
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('Not Found Foo')
    })

    it('internal server error', async () => {
      const res = await app.request('http://localhost/error')
      expect(res.status).toBe(500)
      console.log(await res.text())
    })
  })

  describe('Chained route', () => {
    const app = new Hono()
    app
      .use('/chained/*', async (c, next) => {
        c.req.raw.headers.append('x-before', 'abc')
        await next()
      })
      .use(async (c, next) => {
        await next()
        c.header(
          'x-after',
          c.req.header('x-before') ?? throwExpression('missing `x-before` header')
        )
      })
      .get('/chained/abc', (c) => {
        return c.text('GET chained')
      })
    it('GET /chained/abc', async () => {
      const res = await app.request('http://localhost/chained/abc')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('GET chained')
      expect(res.headers.get('x-after')).toBe('abc')
    })
  })

  describe('Multiple handler', () => {
    const app = new Hono()
    app
      .use(
        '/multiple/*',
        async (c, next) => {
          c.req.raw.headers.append('x-before', 'abc')
          await next()
        },
        async (c, next) => {
          await next()
          c.header(
            'x-after',
            c.req.header('x-before') ?? throwExpression('missing `x-before` header')
          )
        }
      )
      .get('/multiple/abc', (c) => {
        return c.text('GET multiple')
      })
    it('GET /multiple/abc', async () => {
      const res = await app.request('http://localhost/multiple/abc')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('GET multiple')
      expect(res.headers.get('x-after')).toBe('abc')
    })
  })

  describe('Overwrite the response from middleware after next()', () => {
    const app = new Hono()

    app.use('/normal', async (c, next) => {
      await next()
      c.res = new Response('Middleware')
    })

    app.use('/overwrite', async (c, next) => {
      await next()
      c.res = undefined
      c.res = new Response('Middleware')
    })

    app.get('*', (c) => {
      c.header('x-custom', 'foo')
      return c.text('Handler')
    })

    it('Should have the custom header', async () => {
      const res = await app.request('/normal')
      expect(res.headers.get('x-custom')).toBe('foo')
    })

    it('Should not have the custom header', async () => {
      const res = await app.request('/overwrite')
      expect(res.headers.get('x-custom')).toBe(null)
    })
  })
})

describe('Builtin Middleware', () => {
  const app = new Hono()
  app.use('/abc', poweredBy())
  app.use('/def', async (c, next) => {
    const middleware = poweredBy()
    await middleware(c, next)
  })
  app.get('/abc', () => new Response())
  app.get('/def', () => new Response())

  it('"powered-by" middleware', async () => {
    const res = await app.request('http://localhost/abc')
    expect(res.headers.get('x-powered-by')).toBe('Hono')
  })

  it('"powered-by" middleware in a handler', async () => {
    const res = await app.request('http://localhost/def')
    expect(res.headers.get('x-powered-by')).toBe('Hono')
  })
})

describe('Middleware with app.HTTP_METHOD', () => {
  describe('Basic', () => {
    const app = new Hono()

    app.all('*', async (c, next) => {
      c.header('x-before-dispatch', 'foo')
      await next()
      c.header('x-custom-message', 'hello')
    })

    const customHeader = async (c: Context, next: Next) => {
      c.req.raw.headers.append('x-custom-foo', 'bar')
      await next()
    }

    const customHeader2 = async (c: Context, next: Next) => {
      await next()
      c.header('x-custom-foo-2', 'bar-2')
    }

    app
      .get('/abc', customHeader, (c) => {
        const foo = c.req.header('x-custom-foo') || ''
        return c.text(foo)
      })
      .post(customHeader2, (c) => {
        return c.text('POST /abc')
      })

    it('GET /abc', async () => {
      const res = await app.request('http://localhost/abc')
      expect(res.status).toBe(200)
      expect(res.headers.get('x-custom-message')).toBe('hello')
      expect(res.headers.get('x-before-dispatch')).toBe('foo')
      expect(await res.text()).toBe('bar')
    })
    it('POST /abc', async () => {
      const res = await app.request('http://localhost/abc', { method: 'POST' })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('POST /abc')
      expect(res.headers.get('x-custom-foo-2')).toBe('bar-2')
    })
  })

  describe('With builtin middleware', () => {
    const app = new Hono()
    app.get('/abc', poweredBy(), (c) => {
      return c.text('GET /abc')
    })
    it('GET /abc', async () => {
      const res = await app.request('http://localhost/abc')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('GET /abc')
      expect(res.headers.get('x-powered-by')).toBe('Hono')
    })
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

  describe('Not Found with a middleware', () => {
    const app = new Hono()

    app.get('/', (c) => c.text('hello'))
    app.use('*', async (c, next) => {
      await next()
      c.res = new Response((await c.res.text()) + ' + Middleware', c.res)
    })

    it('Custom 404 Not Found', async () => {
      let res = await app.request('http://localhost/')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('hello')
      res = await app.request('http://localhost/foo')
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('404 Not Found + Middleware')
    })
  })

  describe('Not Found with some middleware', () => {
    const app = new Hono()

    app.get('/', (c) => c.text('hello'))
    app.use('*', async (c, next) => {
      await next()
      c.res = new Response((await c.res.text()) + ' + Middleware 1', c.res)
    })
    app.use('*', async (c, next) => {
      await next()
      c.res = new Response((await c.res.text()) + ' + Middleware 2', c.res)
    })

    it('Custom 404 Not Found', async () => {
      let res = await app.request('http://localhost/')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('hello')
      res = await app.request('http://localhost/foo')
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('404 Not Found + Middleware 2 + Middleware 1')
    })
  })

  describe('No response from a handler', () => {
    const app = new Hono()

    app.get('/', (c) => c.text('hello'))
    app.get('/not-found', async (c) => undefined)

    it('Custom 404 Not Found', async () => {
      let res = await app.request('http://localhost/')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('hello')
      res = await app.request('http://localhost/not-found')
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('404 Not Found')
    })
  })

  describe('Custom 404 Not Found with a middleware like Compress Middleware', () => {
    const app = new Hono()

    // Custom Middleware which creates a new Response object after `next()`.
    app.use('*', async (c, next) => {
      await next()
      c.res = new Response(await c.res.text(), c.res)
    })

    app.notFound((c) => {
      return c.text('Custom NotFound', 404)
    })

    it('Custom 404 Not Found', async () => {
      const res = await app.request('http://localhost/')
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('Custom NotFound')
    })
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
    expect(res.headers.get('Location')).toBe('/')
  })
})

describe('Error handle', () => {
  describe('Basic', () => {
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

  describe('Async custom handler', () => {
    const app = new Hono()

    app.get('/error', () => {
      throw new Error('This is Error')
    })

    app.use('/error-middleware', async () => {
      throw new Error('This is Middleware Error')
    })

    app.onError(async (err, c) => {
      const promise = new Promise((resolve) =>
        setTimeout(() => {
          resolve('Promised')
        }, 1)
      )
      const message = (await promise) as string
      c.header('x-debug', err.message)
      return c.text(`Custom Error Message with ${message}`, 500)
    })

    it('Custom Error Message', async () => {
      let res = await app.request('https://example.com/error')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('Custom Error Message with Promised')
      expect(res.headers.get('x-debug')).toBe('This is Error')

      res = await app.request('https://example.com/error-middleware')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('Custom Error Message with Promised')
      expect(res.headers.get('x-debug')).toBe('This is Middleware Error')
    })
  })

  describe('Handle HTTPException', () => {
    const app = new Hono()

    app.get('/exception', () => {
      throw new HTTPException(401, {
        message: 'Unauthorized',
      })
    })

    it('Should return 401 response', async () => {
      const res = await app.request('http://localhost/exception')
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
    })

    const app2 = new Hono()

    app2.get('/exception', () => {
      throw new HTTPException(401)
    })

    app2.onError((err, c) => {
      if (err instanceof HTTPException && err.status === 401) {
        return c.text('Custom Error Message', 401)
      }
      return c.text('Internal Server Error', 500)
    })

    it('Should return 401 response with a custom message', async () => {
      const res = await app2.request('http://localhost/exception')
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Custom Error Message')
    })
  })
})

describe('Error handling in middleware', () => {
  const app = new Hono()

  app.get('/handle-error-in-middleware', async (c, next) => {
    await next()
    if (c.error) {
      const message = c.error.message
      c.res = c.text(`Handle the error in middleware, original message is ${message}`, 500)
    }
  })

  app.get('/handle-error-in-middleware-async', async (c, next) => {
    await next()
    if (c.error) {
      const message = c.error.message
      c.res = c.text(
        `Handle the error in middleware with async, original message is ${message}`,
        500
      )
    }
  })

  app.get('/handle-error-in-middleware', () => {
    throw new Error('Error message')
  })

  app.get('/handle-error-in-middleware-async', async () => {
    throw new Error('Error message')
  })

  it('Should handle the error in middleware', async () => {
    const res = await app.request('https://example.com/handle-error-in-middleware')
    expect(res.status).toBe(500)
    expect(await res.text()).toBe(
      'Handle the error in middleware, original message is Error message'
    )
  })

  it('Should handle the error in middleware - async', async () => {
    const res = await app.request('https://example.com/handle-error-in-middleware-async')
    expect(res.status).toBe(500)
    expect(await res.text()).toBe(
      'Handle the error in middleware with async, original message is Error message'
    )
  })

  describe('Default route app.use', () => {
    const app = new Hono()
    app
      .use(async (c, next) => {
        c.header('x-default-use', 'abc')
        await next()
      })
      .get('/multiple/abc', (c) => {
        return c.text('GET multiple')
      })
    it('GET /multiple/abc', async () => {
      const res = await app.request('http://localhost/multiple/abc')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('GET multiple')
      expect(res.headers.get('x-default-use')).toBe('abc')
    })
  })

  describe('Error in `notFound()`', () => {
    const app = new Hono()

    app.use('*', async () => {})

    app.notFound(() => {
      throw new Error('Error in Not Found')
    })

    app.onError((err, c) => {
      return c.text(err.message, 400)
    })

    it('Should handle the error thrown in `notFound()``', async () => {
      const res = await app.request('http://localhost/')
      expect(res.status).toBe(400)
      expect(await res.text()).toBe('Error in Not Found')
    })
  })
})

describe('Request methods with custom middleware', () => {
  const app = new Hono()

  app.use('*', async (c, next) => {
    const query = c.req.query('foo')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const param = c.req.param('foo') // This will cause a type error.
    const header = c.req.header('User-Agent')
    await next()
    c.header('X-Query-2', query ?? throwExpression('missing `X-Query-2` header'))
    c.header('X-Param-2', param)
    c.header('X-Header-2', header ?? throwExpression('missing `X-Header-2` header'))
  })

  app.get('/:foo', (c) => {
    const query = c.req.query('foo')
    const param = c.req.param('foo')
    const header = c.req.header('User-Agent')
    c.header('X-Query', query ?? throwExpression('missing `X-Query` header'))
    c.header('X-Param', param)
    c.header('X-Header', header ?? throwExpression('missing `X-Header` header'))
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
    expect(res.headers.get('X-Param-2')).toBe(null)
    expect(res.headers.get('X-Header-2')).toBe('bar')
  })
})

describe('Middleware + c.json(0, requestInit)', () => {
  const app = new Hono()
  app.use('/', async (c, next) => {
    await next()
  })
  app.get('/', (c) => {
    return c.json(0, {
      status: 200,
      headers: {
        foo: 'bar',
      },
    })
  })
  it('Should return a correct headers', async () => {
    const res = await app.request('/')
    expect(res.headers.get('content-type')).toMatch(/^application\/json/)
    expect(res.headers.get('foo')).toBe('bar')
  })
})

describe('Hono with `app.route`', () => {
  describe('Basic', () => {
    const app = new Hono()
    const api = new Hono()
    const middleware = new Hono()

    api.use('*', async (c, next) => {
      await next()
      c.res.headers.append('x-custom-a', 'a')
    })

    api.get('/posts', (c) => c.text('List'))
    api.post('/posts', (c) => c.text('Create'))
    api.get('/posts/:id', (c) => c.text(`GET ${c.req.param('id')}`))

    middleware.use('*', async (c, next) => {
      await next()
      c.res.headers.append('x-custom-b', 'b')
    })

    app.route('/api', middleware)
    app.route('/api', api)

    app.get('/foo', (c) => c.text('bar'))

    it('Should return not found response', async () => {
      const res = await app.request('http://localhost/')
      expect(res.status).toBe(404)
    })

    it('Should return not found response', async () => {
      const res = await app.request('http://localhost/posts')
      expect(res.status).toBe(404)
    })

    test('GET /api/posts', async () => {
      const res = await app.request('http://localhost/api/posts')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('List')
    })

    test('Custom header by middleware', async () => {
      const res = await app.request('http://localhost/api/posts')
      expect(res.status).toBe(200)
      expect(res.headers.get('x-custom-a')).toBe('a')
      expect(res.headers.get('x-custom-b')).toBe('b')
    })

    test('POST /api/posts', async () => {
      const res = await app.request('http://localhost/api/posts', { method: 'POST' })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Create')
    })

    test('GET /api/posts/123', async () => {
      const res = await app.request('http://localhost/api/posts/123')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('GET 123')
    })

    test('GET /foo', async () => {
      const res = await app.request('http://localhost/foo')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('bar')
    })

    describe('With app.get(...handler)', () => {
      const app = new Hono()
      const about = new Hono()
      about.get((c) => c.text('me'))
      const subApp = new Hono()
      subApp.route('/about', about)
      app.route('/', subApp)

      it('Should return 200 response - /about', async () => {
        const res = await app.request('/about')
        expect(res.status).toBe(200)
        expect(await res.text()).toBe('me')
      })

      test('Should return 404 response /about/foo', async () => {
        const res = await app.request('/about/foo')
        expect(res.status).toBe(404)
      })
    })

    describe('With app.get(...handler) and app.basePath()', () => {
      const app = new Hono()
      const about = new Hono().basePath('/about')
      about.get((c) => c.text('me'))
      app.route('/', about)

      it('Should return 200 response - /about', async () => {
        const res = await app.request('/about')
        expect(res.status).toBe(200)
        expect(await res.text()).toBe('me')
      })

      test('Should return 404 response /about/foo', async () => {
        const res = await app.request('/about/foo')
        expect(res.status).toBe(404)
      })
    })
  })

  describe('Chaining', () => {
    const app = new Hono()
    const route = new Hono()
    route.get('/post', (c) => c.text('GET /POST v2')).post((c) => c.text('POST /POST v2'))
    app.route('/v2', route)

    it('Should return 200 response - GET /v2/post', async () => {
      const res = await app.request('http://localhost/v2/post')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('GET /POST v2')
    })

    it('Should return 200 response - POST /v2/post', async () => {
      const res = await app.request('http://localhost/v2/post', { method: 'POST' })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('POST /POST v2')
    })

    it('Should return 404 response - DELETE /v2/post', async () => {
      const res = await app.request('http://localhost/v2/post', { method: 'DELETE' })
      expect(res.status).toBe(404)
    })
  })

  describe('Nested', () => {
    const app = new Hono()
    const api = new Hono()
    const book = new Hono()

    book.get('/', (c) => c.text('list books'))
    book.get('/:id', (c) => c.text(`book ${c.req.param('id')}`))

    api.get('/', (c) => c.text('this is API'))
    api.route('/book', book)

    app.get('/', (c) => c.text('root'))
    app.route('/v2', api)

    it('Should return 200 response - GET /', async () => {
      const res = await app.request('http://localhost/')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('root')
    })

    it('Should return 200 response - GET /v2', async () => {
      const res = await app.request('http://localhost/v2')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('this is API')
    })

    it('Should return 200 response - GET /v2/book', async () => {
      const res = await app.request('http://localhost/v2/book')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('list books')
    })

    it('Should return 200 response - GET /v2/book/123', async () => {
      const res = await app.request('http://localhost/v2/book/123')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('book 123')
    })
  })

  describe('onError', () => {
    const app = new Hono()
    const sub = new Hono()

    app.use('*', async (c, next) => {
      await next()
      if (c.req.query('app-error')) {
        throw new Error('This is Error')
      }
    })

    app.onError((err, c) => {
      return c.text('onError by app', 500)
    })

    sub.get('/posts/:id', async (c, next) => {
      c.header('handler-chain', '1')
      await next()
    })

    sub.get('/posts/:id', (c) => {
      return c.text(`post: ${c.req.param('id')}`)
    })

    sub.get('/error', () => {
      throw new Error('This is Error')
    })

    sub.onError((err, c) => {
      return c.text('onError by sub', 500)
    })

    app.route('/sub', sub)

    it('GET /posts/123 for sub', async () => {
      const res = await app.request('https://example.com/sub/posts/123')
      expect(res.status).toBe(200)
      expect(res.headers.get('handler-chain')).toBe('1')
      expect(await res.text()).toBe('post: 123')
    })

    it('should be handled by app', async () => {
      const res = await app.request('https://example.com/sub/ok?app-error=1')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('onError by app')
    })

    it('should be handled by sub', async () => {
      const res = await app.request('https://example.com/sub/error')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('onError by sub')
    })
  })

  describe('onError for a single handler', () => {
    const app = new Hono()
    const sub = new Hono()

    sub.get('/ok', (c) => c.text('OK'))

    sub.get('/error', () => {
      throw new Error('This is Error')
    })

    sub.onError((err, c) => {
      return c.text('onError by sub', 500)
    })

    app.route('/sub', sub)

    it('ok', async () => {
      const res = await app.request('https://example.com/sub/ok')
      expect(res.status).toBe(200)
    })

    it('error', async () => {
      const res = await app.request('https://example.com/sub/error')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('onError by sub')
    })
  })

  describe('notFound', () => {
    const app = new Hono()
    const sub = new Hono()

    app.get('/explicit-404', async (c) => {
      c.header('explicit', '1')
    })

    app.notFound((c) => {
      return c.text('404 Not Found by app', 404)
    })

    sub.get('/ok', (c) => {
      return c.text('ok')
    })

    sub.get('/explicit-404', async (c) => {
      c.header('explicit', '1')
    })

    sub.notFound((c) => {
      return c.text('404 Not Found by sub', 404)
    })

    app.route('/sub', sub)

    it('/explicit-404 should be handled on app', async () => {
      const res = await app.request('https://example.com/explicit-404')
      expect(res.status).toBe(404)
      expect(res.headers.get('explicit')).toBe('1')
      expect(await res.text()).toBe('404 Not Found by app')
    })

    it('/sub/explicit-404 should be handled on app', async () => {
      const res = await app.request('https://example.com/sub/explicit-404')
      expect(res.status).toBe(404)
      expect(res.headers.get('explicit')).toBe('1')
      expect(await res.text()).toBe('404 Not Found by app')
    })

    it('/implicit-404 should be handled by app', async () => {
      const res = await app.request('https://example.com/implicit-404')
      expect(res.status).toBe(404)
      expect(res.headers.get('explicit')).toBe(null)
      expect(await res.text()).toBe('404 Not Found by app')
    })

    it('/sub/implicit-404 should be handled by sub', async () => {
      const res = await app.request('https://example.com/sub/implicit-404')
      expect(res.status).toBe(404)
      expect(res.headers.get('explicit')).toBe(null)
      expect(await res.text()).toBe('404 Not Found by app')
    })
  })
})

describe('Using other methods with `app.on`', () => {
  it('Should handle PURGE method with RegExpRouter', async () => {
    const app = new Hono({ router: new RegExpRouter() })

    app.on('PURGE', '/purge', (c) => c.text('Accepted', 202))

    const req = new Request('http://localhost/purge', {
      method: 'PURGE',
    })
    const res = await app.request(req)
    expect(res.status).toBe(202)
    expect(await res.text()).toBe('Accepted')
  })

  it('Should handle PURGE method with TrieRouter', async () => {
    const app = new Hono({ router: new TrieRouter() })

    app.on('PURGE', '/purge', (c) => c.text('Accepted', 202))

    const req = new Request('http://localhost/purge', {
      method: 'PURGE',
    })
    const res = await app.request(req)
    expect(res.status).toBe(202)
    expect(await res.text()).toBe('Accepted')
  })
})

describe('Multiple methods with `app.on`', () => {
  const app = new Hono()
  app.on(['PUT', 'DELETE'], '/posts/:id', (c) => {
    return c.json({
      postId: c.req.param('id'),
      method: c.req.method,
    })
  })

  it('Should return 200 with PUT', async () => {
    const req = new Request('http://localhost/posts/123', {
      method: 'PUT',
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      postId: '123',
      method: 'PUT',
    })
  })

  it('Should return 200 with DELETE', async () => {
    const req = new Request('http://localhost/posts/123', {
      method: 'DELETE',
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      postId: '123',
      method: 'DELETE',
    })
  })

  it('Should return 404 with POST', async () => {
    const req = new Request('http://localhost/posts/123', {
      method: 'POST',
    })
    const res = await app.request(req)
    expect(res.status).toBe(404)
  })
})

describe('Multiple paths with one handler', () => {
  const app = new Hono()

  const paths = ['/hello', '/ja/hello', '/en/hello']
  app.on('GET', paths, (c) => {
    return c.json({
      path: c.req.path,
      routePath: c.req.routePath,
    })
  })

  it('Should handle multiple paths', async () => {
    paths.map(async (path) => {
      const res = await app.request(path)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual({
        path,
        routePath: path,
      })
    })
  })
})

describe('Multiple handler', () => {
  describe('handler + handler', () => {
    const app = new Hono()

    app.get('/posts/:id', (c) => {
      const id = c.req.param('id')
      c.header('foo', 'bar')
      return c.text(`id is ${id}`)
    })

    app.get('/:type/:id', (c) => {
      c.status(404)
      c.header('foo2', 'bar2')
      return c.text('foo')
    })
    it('Should return response from `specialized` route', async () => {
      const res = await app.request('http://localhost/posts/123')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('id is 123')
      expect(res.headers.get('foo')).toBe('bar')
      expect(res.headers.get('foo2')).toBeNull()
    })
  })

  describe('Duplicate param name', () => {
    describe('basic', () => {
      const app = new Hono()
      app.get('/:type/:url', (c) => {
        return c.text(`type: ${c.req.param('type')}, url: ${c.req.param('url')}`)
      })
      app.get('/foo/:type/:url', (c) => {
        return c.text(`foo type: ${c.req.param('type')}, url: ${c.req.param('url')}`)
      })

      it('Should return a correct param - GET /car/good-car', async () => {
        const res = await app.request('/car/good-car')
        expect(res.ok).toBe(true)
        expect(await res.text()).toBe('type: car, url: good-car')
      })
      it('Should return a correct param - GET /foo/food/good-food', async () => {
        const res = await app.request('/foo/food/good-food')
        expect(res.ok).toBe(true)
        expect(await res.text()).toBe('foo type: food, url: good-food')
      })
    })

    describe('self', () => {
      const app = new Hono()
      app.get('/:id/:id', (c) => {
        const id = c.req.param('id')
        return c.text(`id is ${id}`)
      })
      it('Should return 123 - GET /123/456', async () => {
        const res = await app.request('/123/456')
        expect(res.status).toBe(200)
        expect(await res.text()).toBe('id is 123')
      })
    })

    describe('hierarchy', () => {
      const app = new Hono()
      app.get('/posts/:id/comments/:comment_id', (c) => {
        return c.text(`post: ${c.req.param('id')}, comment: ${c.req.param('comment_id')}`)
      })
      app.get('/posts/:id', (c) => {
        return c.text(`post: ${c.req.param('id')}`)
      })
      it('Should return a correct param - GET /posts/123/comments/456', async () => {
        const res = await app.request('/posts/123/comments/456')
        expect(res.status).toBe(200)
        expect(await res.text()).toBe('post: 123, comment: 456')
      })
      it('Should return a correct param - GET /posts/789', async () => {
        const res = await app.request('/posts/789')
        expect(res.status).toBe(200)
        expect(await res.text()).toBe('post: 789')
      })
    })

    describe('different regular expression', () => {
      const app = new Hono()
      app.get('/:id/:action{create|update}', (c) => {
        return c.text(`id: ${c.req.param('id')}, action: ${c.req.param('action')}`)
      })
      app.get('/:id/:action{delete}', (c) => {
        return c.text(`id: ${c.req.param('id')}, action: ${c.req.param('action')}`)
      })

      it('Should return a correct param - GET /123/create', async () => {
        const res = await app.request('/123/create')
        expect(res.status).toBe(200)
        expect(await res.text()).toBe('id: 123, action: create')
      })
      it('Should return a correct param - GET /456/update', async () => {
        const res = await app.request('/467/update')
        expect(res.status).toBe(200)
        expect(await res.text()).toBe('id: 467, action: update')
      })
      it('Should return a correct param - GET /789/delete', async () => {
        const res = await app.request('/789/delete')
        expect(res.status).toBe(200)
        expect(await res.text()).toBe('id: 789, action: delete')
      })
    })
  })
})

describe('Multiple handler - async', () => {
  describe('handler + handler', () => {
    const app = new Hono()
    app.get('/posts/:id', async (c) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      c.header('foo2', 'bar2')
      const id = c.req.param('id')
      return c.text(`id is ${id}`)
    })
    app.get('/:type/:id', async (c) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      c.header('foo', 'bar')
      c.status(404)
      return c.text('foo')
    })

    it('Should return response from `specialized` route', async () => {
      const res = await app.request('http://localhost/posts/123')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('id is 123')
      expect(res.headers.get('foo')).toBeNull()
      expect(res.headers.get('foo2')).toBe('bar2')
    })
  })
})

describe('Context is not finalized', () => {
  it('should throw error - lack `await next()`', async () => {
    const app = new Hono()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    app.use('*', () => {})
    app.get('/foo', (c) => {
      return c.text('foo')
    })
    app.onError((err, c) => {
      return c.text(err.message, 500)
    })
    const res = await app.request('http://localhost/foo')
    expect(res.status).toBe(500)
    expect(await res.text()).toMatch(/^Context is not finalized/)
  })

  it('should throw error - lack `returning Response`', async () => {
    const app = new Hono()
    app.use('*', async (_c, next) => {
      await next()
    })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    app.get('/foo', () => {})
    app.onError((err, c) => {
      return c.text(err.message, 500)
    })
    const res = await app.request('http://localhost/foo')
    expect(res.status).toBe(500)
    expect(await res.text()).toMatch(/^Context is not finalized/)
  })
})

describe('Parse Body', () => {
  const app = new Hono()

  app.post('/json', async (c) => {
    return c.json<{}>(await c.req.parseBody(), 200)
  })
  app.post('/form', async (c) => {
    return c.json<{}>(await c.req.parseBody(), 200)
  })

  it('POST with JSON', async () => {
    const req = new Request('http://localhost/json', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello hono' }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    })
    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
  })

  it('POST with `multipart/form-data`', async () => {
    const formData = new FormData()
    formData.append('message', 'hello')
    const req = new Request('https://localhost/form', {
      method: 'POST',
      body: formData,
    })

    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ message: 'hello' })
  })

  it('POST with `application/x-www-form-urlencoded`', async () => {
    const searchParam = new URLSearchParams()
    searchParam.append('message', 'hello')
    const req = new Request('https://localhost/form', {
      method: 'POST',
      body: searchParam,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const res = await app.request(req)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ message: 'hello' })
  })
})

describe('Both two middleware returning response', () => {
  it('Should return correct Content-Type`', async () => {
    const app = new Hono()
    app.use('*', async (c, next) => {
      await next()
      return c.html('Foo')
    })
    app.get('/', (c) => {
      return c.text('Bar')
    })
    const res = await app.request('http://localhost/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Bar')
    expect(res.headers.get('Content-Type')).toMatch(/^text\/plain/)
  })
})

describe('Count of logger called', () => {
  // It will be added `2` each time the logger is called once.
  let count = 0
  let log = ''

  const app = new Hono()

  const logFn = (str: string) => {
    count++
    log = str
  }

  app.use('*', logger(logFn))
  app.get('/', (c) => c.text('foo'))

  it('Should be called two times', async () => {
    const res = await app.request('http://localhost/not-found')
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('404 Not Found')
    expect(count).toBe(2)
    expect(log).toMatch(/404/)
  })

  it('Should be called two times / Custom Not Found', async () => {
    app.notFound((c) => c.text('Custom Not Found', 404))
    const res = await app.request('http://localhost/custom-not-found')
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('Custom Not Found')
    expect(count).toBe(4)
    expect(log).toMatch(/404/)
  })
})

describe('Context set/get variables', () => {
  type Variables = {
    id: number
    title: string
  }

  const app = new Hono<{ Variables: Variables }>()

  it('Should set and get variables with correct types', async () => {
    app.use('*', async (c, next) => {
      c.set('id', 123)
      c.set('title', 'Hello')
      await next()
    })
    app.get('/', (c) => {
      const id = c.get('id')
      const title = c.get('title')
      // type verifyID = Expect<Equal<number, typeof id>>
      expectTypeOf(id).toEqualTypeOf<number>()
      // type verifyTitle = Expect<Equal<string, typeof title>>
      expectTypeOf(title).toEqualTypeOf<string>()
      return c.text(`${id} is ${title}`)
    })
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('123 is Hello')
  })
})

describe('Context binding variables', () => {
  type Bindings = {
    USER_ID: number
    USER_NAME: string
  }

  const app = new Hono<{ Bindings: Bindings }>()

  it('Should get binding variables with correct types', async () => {
    app.get('/', (c) => {
      expectTypeOf(c.env).toEqualTypeOf<Bindings>()
      return c.text('These are verified')
    })
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
  })
})

describe('Handler as variables', () => {
  const app = new Hono()

  it('Should be typed correctly', async () => {
    const handler: Handler = (c) => {
      const id = c.req.param('id')
      return c.text(`Post id is ${id}`)
    }
    app.get('/posts/:id', handler)

    const res = await app.request('http://localhost/posts/123')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Post id is 123')
  })
})

describe('json', () => {
  const api = new Hono()

  api.get('/message', (c) => {
    return c.json({
      message: 'Hello',
    })
  })

  api.get('/message-async', async (c) => {
    return c.json({
      message: 'Hello',
    })
  })

  describe('Single handler', () => {
    const app = new Hono()
    app.route('/api', api)

    it('Should return 200 response', async () => {
      const res = await app.request('http://localhost/api/message')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        message: 'Hello',
      })
    })

    it('Should return 200 response - with async', async () => {
      const res = await app.request('http://localhost/api/message-async')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        message: 'Hello',
      })
    })
  })

  describe('With middleware', () => {
    const app = new Hono()
    app.use('*', async (_c, next) => {
      await next()
    })
    app.route('/api', api)

    it('Should return 200 response', async () => {
      const res = await app.request('http://localhost/api/message')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        message: 'Hello',
      })
    })

    it('Should return 200 response - with async', async () => {
      const res = await app.request('http://localhost/api/message-async')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        message: 'Hello',
      })
    })
  })
})

describe('Optional parameters', () => {
  const app = new Hono()
  app.get('/api/:version/animal/:type?', (c) => {
    const type1 = c.req.param('type')
    expectTypeOf(type1).toEqualTypeOf<string | undefined>()
    const { type, version } = c.req.param()
    expectTypeOf(version).toEqualTypeOf<string>()
    expectTypeOf(type).toEqualTypeOf<string | undefined>()

    return c.json({
      type: type,
    })
  })

  it('Should match with an optional parameter', async () => {
    const res = await app.request('http://localhost/api/v1/animal/bird')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      type: 'bird',
    })
  })

  it('Should match without an optional parameter', async () => {
    const res = await app.request('http://localhost/api/v1/animal')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      type: undefined,
    })
  })

  it('Should have a correct type with an optional parameter in a regexp path', async () => {
    const app = new Hono()
    app.get('/url/:url{.*}?', (c) => {
      const url = c.req.param('url')
      expectTypeOf(url).toEqualTypeOf<string | undefined>()
      return c.json(0)
    })
  })
})

describe('app.mount()', () => {
  describe('Basic', () => {
    const anotherApp = (req: Request, params: unknown) => {
      const path = getPath(req)
      if (path === '/') {
        return new Response('AnotherApp')
      }
      if (path === '/hello') {
        return new Response('Hello from AnotherApp')
      }
      if (path === '/header') {
        const message = req.headers.get('x-message')
        return new Response(message)
      }
      if (path === '/with-query') {
        const queryStrings = new URL(req.url).searchParams.toString()
        return new Response(queryStrings)
      }
      if (path == '/with-params') {
        return new Response(
          JSON.stringify({
            params,
          }),
          {
            headers: {
              'Content-Type': 'application.json',
            },
          }
        )
      }
      return new Response('Not Found from AnotherApp', {
        status: 404,
      })
    }

    const app = new Hono()
    app.use('*', async (c, next) => {
      await next()
      c.header('x-message', 'Foo')
    })
    app.get('/', (c) => c.text('Hono'))
    app.mount('/another-app', anotherApp, () => {
      return 'params'
    })
    app.mount('/another-app2/sub-slash/', anotherApp)

    const api = new Hono().basePath('/api')
    api.mount('/another-app', anotherApp)

    it('Should return responses from Hono app', async () => {
      const res = await app.request('/')
      expect(res.status).toBe(200)
      expect(res.headers.get('x-message')).toBe('Foo')
      expect(await res.text()).toBe('Hono')
    })

    it('Should return responses from AnotherApp', async () => {
      let res = await app.request('/another-app')
      expect(res.status).toBe(200)
      expect(res.headers.get('x-message')).toBe('Foo')
      expect(await res.text()).toBe('AnotherApp')

      res = await app.request('/another-app/hello')
      expect(res.status).toBe(200)
      expect(res.headers.get('x-message')).toBe('Foo')
      expect(await res.text()).toBe('Hello from AnotherApp')

      const req = new Request('http://localhost/another-app/header', {
        headers: {
          'x-message': 'Message Foo!',
        },
      })
      res = await app.request(req)
      expect(res.status).toBe(200)
      expect(res.headers.get('x-message')).toBe('Foo')
      expect(await res.text()).toBe('Message Foo!')

      res = await app.request('/another-app/not-found')
      expect(res.status).toBe(404)
      expect(res.headers.get('x-message')).toBe('Foo')
      expect(await res.text()).toBe('Not Found from AnotherApp')

      res = await app.request('/another-app/with-query?foo=bar&baz=qux')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('foo=bar&baz=qux')

      res = await app.request('/another-app/with-params')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        params: 'params',
      })
    })

    it('Should return responses from AnotherApp - sub + slash', async () => {
      const res = await app.request('/another-app2/sub-slash')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('AnotherApp')
    })

    it('Should return responses from AnotherApp - with `basePath()`', async () => {
      const res = await api.request('/api/another-app')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('AnotherApp')
    })
  })

  describe('With fetch', () => {
    const anotherApp = async (req: Request, env: {}, executionContext: ExecutionContext) => {
      const path = getPath(req)
      if (path === '/') {
        return new Response(
          JSON.stringify({
            env,
            executionContext,
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      }
      return new Response('Not Found from AnotherApp', {
        status: 404,
      })
    }

    const app = new Hono()
    app.mount('/another-app', anotherApp)

    it('Should handle Env and ExecuteContext', async () => {
      const request = new Request('http://localhost/another-app')
      const res = await app.fetch(
        request,
        {
          TOKEN: 'foo',
        },
        {
          // Force mocking!
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          waitUntil: 'waitUntil',
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          passThroughOnException: 'passThroughOnException',
        }
      )
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        env: {
          TOKEN: 'foo',
        },
        executionContext: {
          waitUntil: 'waitUntil',
          passThroughOnException: 'passThroughOnException',
        },
      })
    })
  })

  describe('Mount on `/`', () => {
    const anotherApp = (req: Request, params: unknown) => {
      const path = getPath(req)
      if (path === '/') {
        return new Response('AnotherApp')
      }
      if (path === '/hello') {
        return new Response('Hello from AnotherApp')
      }
      if (path === '/good/night') {
        return new Response('Good Night from AnotherApp')
      }
      return new Response('Not Found from AnotherApp', {
        status: 404,
      })
    }

    const app = new Hono()
    app.mount('/', anotherApp)

    it('Should return responses from AnotherApp - mount on `/`', async () => {
      let res = await app.request('/')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('AnotherApp')
      res = await app.request('/hello')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Hello from AnotherApp')
      res = await app.request('/good/night')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Good Night from AnotherApp')
      res = await app.request('/not-found')
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('Not Found from AnotherApp')
    })
  })
})

describe('HEAD method', () => {
  const app = new Hono()

  app.get('/page', (c) => {
    c.header('X-Message', 'Foo')
    c.header('X-Method', c.req.method)
    return c.text('/page')
  })

  it('Should return 200 response with body - GET /page', async () => {
    const res = await app.request('/page')
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Message')).toBe('Foo')
    expect(res.headers.get('X-Method')).toBe('GET')
    expect(await res.text()).toBe('/page')
  })

  it('Should return 200 response without body - HEAD /page', async () => {
    const req = new Request('http://localhost/page', {
      method: 'HEAD',
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Message')).toBe('Foo')
    expect(res.headers.get('X-Method')).toBe('HEAD')
    expect(res.body).toBe(null)
  })
})

declare module './context' {
  interface ContextRenderer {
    (content: string | Promise<string>, head: { title: string }): Response | Promise<Response>
  }
}

describe('Context render and setRenderer', () => {
  const app = new Hono()
  app.get('/default', (c) => {
    return c.render('<h1>content</h1>', { title: 'dummy ' })
  })
  app.use('/page', async (c, next) => {
    c.setRenderer((content, head) => {
      return new Response(
        `<html><head><title>${head.title}</title></head><body><h1>${content}</h1></body></html>`
      )
    })
    await next()
  })
  app.get('/page', (c) => {
    return c.render('page content', {
      title: 'page title',
    })
  })

  it('Should return a Response from the default renderer', async () => {
    const res = await app.request('/default')
    expect(await res.text()).toBe('<h1>content</h1>')
  })

  it('Should return a Response from the custom renderer', async () => {
    const res = await app.request('/page')
    expect(await res.text()).toBe(
      '<html><head><title>page title</title></head><body><h1>page content</h1></body></html>'
    )
  })
})

describe('c.var - with testing types', () => {
  const app = new Hono<{
    Bindings: {
      Token: string
    }
  }>()

  const mw =
    (): MiddlewareHandler<{
      Variables: {
        echo: (str: string) => string
      }
    }> =>
    async (c, next) => {
      c.set('echo', (str) => str)
      await next()
    }

  const mw2 =
    (): MiddlewareHandler<{
      Variables: {
        echo2: (str: string) => string
      }
    }> =>
    async (c, next) => {
      c.set('echo2', (str) => str)
      await next()
    }

  const mw3 =
    (): MiddlewareHandler<{
      Variables: {
        echo3: (str: string) => string
      }
    }> =>
    async (c, next) => {
      c.set('echo3', (str) => str)
      await next()
    }

  const mw4 =
    (): MiddlewareHandler<{
      Variables: {
        echo4: (str: string) => string
      }
    }> =>
    async (c, next) => {
      c.set('echo4', (str) => str)
      await next()
    }

  const mw5 =
    (): MiddlewareHandler<{
      Variables: {
        echo5: (str: string) => string
      }
    }> =>
    async (c, next) => {
      c.set('echo5', (str) => str)
      await next()
    }

  const mw6 =
    (): MiddlewareHandler<{
      Variables: {
        echo6: (str: string) => string
      }
    }> =>
    async (c, next) => {
      c.set('echo6', (str) => str)
      await next()
    }

  const mw7 =
    (): MiddlewareHandler<{
      Variables: {
        echo7: (str: string) => string
      }
    }> =>
    async (c, next) => {
      c.set('echo7', (str) => str)
      await next()
    }

  const mw8 =
    (): MiddlewareHandler<{
      Variables: {
        echo8: (str: string) => string
      }
    }> =>
    async (c, next) => {
      c.set('echo8', (str) => str)
      await next()
    }

  const mw9 =
    (): MiddlewareHandler<{
      Variables: {
        echo9: (str: string) => string
      }
    }> =>
    async (c, next) => {
      c.set('echo9', (str) => str)
      await next()
    }

  const mw10 =
    (): MiddlewareHandler<{
      Variables: {
        echo10: (str: string) => string
      }
    }> =>
    async (c, next) => {
      c.set('echo10', (str) => str)
      await next()
    }

  app.use('/no-path/1').get(mw(), (c) => {
    return c.text(c.var.echo('hello'))
  })

  app.use('/no-path/2').get(mw(), mw2(), (c) => {
    return c.text(c.var.echo('hello') + c.var.echo2('hello2'))
  })

  app.use('/no-path/3').get(mw(), mw2(), mw3(), (c) => {
    return c.text(c.var.echo('hello') + c.var.echo2('hello2') + c.var.echo3('hello3'))
  })

  app.use('/no-path/4').get(mw(), mw2(), mw3(), mw4(), (c) => {
    return c.text(
      c.var.echo('hello') + c.var.echo2('hello2') + c.var.echo3('hello3') + c.var.echo4('hello4')
    )
  })

  app.use('/no-path/5').get(mw(), mw2(), mw3(), mw4(), mw5(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5')
    )
  })

  app.use('/no-path/6').get(mw(), mw2(), mw3(), mw4(), mw5(), mw6(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6')
    )
  })

  app.use('/no-path/7').get(mw(), mw2(), mw3(), mw4(), mw5(), mw6(), mw7(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6') +
        c.var.echo7('hello7')
    )
  })

  app.use('/no-path/8').get(mw(), mw2(), mw3(), mw4(), mw5(), mw6(), mw7(), mw8(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6') +
        c.var.echo7('hello7') +
        c.var.echo8('hello8')
    )
  })

  app.use('/no-path/9').get(mw(), mw2(), mw3(), mw4(), mw5(), mw6(), mw7(), mw8(), mw9(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6') +
        c.var.echo7('hello7') +
        c.var.echo8('hello8') +
        c.var.echo9('hello9')
    )
  })

  app.use('/no-path/10').get(
    // @ts-expect-error
    mw(),
    mw2(),
    mw3(),
    mw4(),
    mw5(),
    mw6(),
    mw7(),
    mw8(),
    mw9(),
    mw10(),
    (c) => {
      return c.text(
        // @ts-expect-error
        c.var.echo('hello') +
          // @ts-expect-error
          c.var.echo2('hello2') +
          // @ts-expect-error
          c.var.echo3('hello3') +
          // @ts-expect-error
          c.var.echo4('hello4') +
          // @ts-expect-error
          c.var.echo5('hello5') +
          // @ts-expect-error
          c.var.echo6('hello6') +
          // @ts-expect-error
          c.var.echo7('hello7') +
          // @ts-expect-error
          c.var.echo8('hello8') +
          // @ts-expect-error
          c.var.echo9('hello9') +
          // @ts-expect-error
          c.var.echo10('hello10')
      )
    }
  )

  app.get('*', mw())

  app.get('/path/1', mw(), (c) => {
    return c.text(c.var.echo('hello'))
  })

  app.get('/path/2', mw(), mw2(), (c) => {
    return c.text(c.var.echo('hello') + c.var.echo2('hello2'))
  })

  app.get('/path/3', mw(), mw2(), mw3(), (c) => {
    return c.text(c.var.echo('hello') + c.var.echo2('hello2') + c.var.echo3('hello3'))
  })

  app.get('/path/4', mw(), mw2(), mw3(), mw4(), (c) => {
    return c.text(
      c.var.echo('hello') + c.var.echo2('hello2') + c.var.echo3('hello3') + c.var.echo4('hello4')
    )
  })

  app.get('/path/5', mw(), mw2(), mw3(), mw4(), mw5(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5')
    )
  })

  app.get('/path/6', mw(), mw2(), mw3(), mw4(), mw5(), mw6(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6')
    )
  })

  app.get('/path/7', mw(), mw2(), mw3(), mw4(), mw5(), mw6(), mw7(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6') +
        c.var.echo7('hello7')
    )
  })

  app.get('/path/8', mw(), mw2(), mw3(), mw4(), mw5(), mw6(), mw7(), mw8(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6') +
        c.var.echo7('hello7') +
        c.var.echo8('hello8')
    )
  })

  app.get('/path/9', mw(), mw2(), mw3(), mw4(), mw5(), mw6(), mw7(), mw8(), mw9(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6') +
        c.var.echo7('hello7') +
        c.var.echo8('hello8') +
        c.var.echo9('hello9')
    )
  })

  // @ts-expect-error
  app.get('/path/10', mw(), mw2(), mw3(), mw4(), mw5(), mw6(), mw7(), mw8(), mw9(), mw10(), (c) => {
    return c.text(
      // @ts-expect-error
      c.var.echo('hello') +
        // @ts-expect-error
        c.var.echo2('hello2') +
        // @ts-expect-error
        c.var.echo3('hello3') +
        // @ts-expect-error
        c.var.echo4('hello4') +
        // @ts-expect-error
        c.var.echo5('hello5') +
        // @ts-expect-error
        c.var.echo6('hello6') +
        // @ts-expect-error
        c.var.echo7('hello7') +
        // @ts-expect-error
        c.var.echo8('hello8') +
        // @ts-expect-error
        c.var.echo9('hello9') +
        // @ts-expect-error
        c.var.echo10('hello10')
    )
  })

  app.on('GET', '/on/1', mw(), (c) => {
    return c.text(c.var.echo('hello'))
  })

  app.on('GET', '/on/2', mw(), mw2(), (c) => {
    return c.text(c.var.echo('hello') + c.var.echo2('hello2'))
  })

  app.on('GET', '/on/3', mw(), mw2(), mw3(), (c) => {
    return c.text(c.var.echo('hello') + c.var.echo2('hello2') + c.var.echo3('hello3'))
  })

  app.on('GET', '/on/4', mw(), mw2(), mw3(), mw4(), (c) => {
    return c.text(
      c.var.echo('hello') + c.var.echo2('hello2') + c.var.echo3('hello3') + c.var.echo4('hello4')
    )
  })

  app.on('GET', '/on/5', mw(), mw2(), mw3(), mw4(), mw5(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5')
    )
  })

  app.on('GET', '/on/6', mw(), mw2(), mw3(), mw4(), mw5(), mw6(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6')
    )
  })

  app.on('GET', '/on/7', mw(), mw2(), mw3(), mw4(), mw5(), mw6(), mw7(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6') +
        c.var.echo7('hello7')
    )
  })

  app.on('GET', '/on/8', mw(), mw2(), mw3(), mw4(), mw5(), mw6(), mw7(), mw8(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6') +
        c.var.echo7('hello7') +
        c.var.echo8('hello8')
    )
  })

  app.on('GET', '/on/9', mw(), mw2(), mw3(), mw4(), mw5(), mw6(), mw7(), mw8(), mw9(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6') +
        c.var.echo7('hello7') +
        c.var.echo8('hello8') +
        c.var.echo9('hello9')
    )
  })

  // @ts-expect-error
  app.on(
    'GET',
    '/on/10',
    mw(),
    mw2(),
    mw3(),
    mw4(),
    mw5(),
    mw6(),
    mw7(),
    mw8(),
    mw9(),
    mw10(),
    (c) => {
      return c.text(
        // @ts-expect-error
        c.var.echo('hello') +
          // @ts-expect-error
          c.var.echo2('hello2') +
          // @ts-expect-error
          c.var.echo3('hello3') +
          // @ts-expect-error
          c.var.echo4('hello4') +
          // @ts-expect-error
          c.var.echo5('hello5') +
          // @ts-expect-error
          c.var.echo6('hello6') +
          // @ts-expect-error
          c.var.echo7('hello7') +
          // @ts-expect-error
          c.var.echo8('hello8') +
          // @ts-expect-error
          c.var.echo9('hello9') +
          // @ts-expect-error
          c.var.echo10('hello10')
      )
    }
  )

  app.on(['GET', 'POST'], '/on/1', mw(), (c) => {
    return c.text(c.var.echo('hello'))
  })

  app.on(['GET', 'POST'], '/on/2', mw(), mw2(), (c) => {
    return c.text(c.var.echo('hello') + c.var.echo2('hello2'))
  })

  app.on(['GET', 'POST'], '/on/3', mw(), mw2(), mw3(), (c) => {
    return c.text(c.var.echo('hello') + c.var.echo2('hello2') + c.var.echo3('hello3'))
  })

  app.on(['GET', 'POST'], '/on/4', mw(), mw2(), mw3(), mw4(), (c) => {
    return c.text(
      c.var.echo('hello') + c.var.echo2('hello2') + c.var.echo3('hello3') + c.var.echo4('hello4')
    )
  })

  app.on(['GET', 'POST'], '/on/5', mw(), mw2(), mw3(), mw4(), mw5(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5')
    )
  })

  app.on(['GET', 'POST'], '/on/6', mw(), mw2(), mw3(), mw4(), mw5(), mw6(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6')
    )
  })

  app.on(['GET', 'POST'], '/on/7', mw(), mw2(), mw3(), mw4(), mw5(), mw6(), mw7(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6') +
        c.var.echo7('hello7')
    )
  })

  app.on(['GET', 'POST'], '/on/8', mw(), mw2(), mw3(), mw4(), mw5(), mw6(), mw7(), mw8(), (c) => {
    return c.text(
      c.var.echo('hello') +
        c.var.echo2('hello2') +
        c.var.echo3('hello3') +
        c.var.echo4('hello4') +
        c.var.echo5('hello5') +
        c.var.echo6('hello6') +
        c.var.echo7('hello7') +
        c.var.echo8('hello8')
    )
  })

  app.on(
    ['GET', 'POST'],
    '/on/9',
    mw(),
    mw2(),
    mw3(),
    mw4(),
    mw5(),
    mw6(),
    mw7(),
    mw8(),
    mw9(),
    (c) => {
      return c.text(
        c.var.echo('hello') +
          c.var.echo2('hello2') +
          c.var.echo3('hello3') +
          c.var.echo4('hello4') +
          c.var.echo5('hello5') +
          c.var.echo6('hello6') +
          c.var.echo7('hello7') +
          c.var.echo8('hello8') +
          c.var.echo9('hello9')
      )
    }
  )

  // @ts-expect-error
  app.on(
    ['GET', 'POST'],
    '/on/10',
    mw(),
    mw2(),
    mw3(),
    mw4(),
    mw5(),
    mw6(),
    mw7(),
    mw8(),
    mw9(),
    mw10(),
    (c) => {
      return c.text(
        // @ts-expect-error
        c.var.echo('hello') +
          // @ts-expect-error
          c.var.echo2('hello2') +
          // @ts-expect-error
          c.var.echo3('hello3') +
          // @ts-expect-error
          c.var.echo4('hello4') +
          // @ts-expect-error
          c.var.echo5('hello5') +
          // @ts-expect-error
          c.var.echo6('hello6') +
          // @ts-expect-error
          c.var.echo7('hello7') +
          // @ts-expect-error
          c.var.echo8('hello8') +
          // @ts-expect-error
          c.var.echo9('hello9') +
          // @ts-expect-error
          c.var.echo10('hello10')
      )
    }
  )

  it('Should return the correct response - no-path', async () => {
    let res = await app.request('/no-path/1')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')

    res = await app.request('/no-path/2')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hellohello2')

    res = await app.request('/no-path/3')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hellohello2hello3')

    res = await app.request('/no-path/4')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hellohello2hello3hello4')

    res = await app.request('/no-path/5')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hellohello2hello3hello4hello5')
  })

  it('Should return the correct response - path', async () => {
    let res = await app.request('/path/1')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')

    res = await app.request('/path/2')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hellohello2')

    res = await app.request('/path/3')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hellohello2hello3')

    res = await app.request('/path/4')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hellohello2hello3hello4')

    res = await app.request('/path/5')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hellohello2hello3hello4hello5')
  })

  it('Should return the correct response - on', async () => {
    let res = await app.request('/on/1')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')

    res = await app.request('/on/2')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hellohello2')

    res = await app.request('/on/3')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hellohello2hello3')

    res = await app.request('/on/4')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hellohello2hello3hello4')

    res = await app.request('/on/5')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hellohello2hello3hello4hello5')
  })

  it('Should not throw type errors', () => {
    const app = new Hono<{
      Variables: {
        hello: () => string
      }
    }>()

    app.get(mw())
    app.get(mw(), mw2())
    app.get(mw(), mw2(), mw3())
    app.get(mw(), mw2(), mw3(), mw4())
    app.get(mw(), mw2(), mw3(), mw4(), mw5())

    app.get('/', mw())
    app.get('/', mw(), mw2())
    app.get('/', mw(), mw2(), mw3())
    app.get('/', mw(), mw2(), mw3(), mw4())
    app.get('/', mw(), mw2(), mw3(), mw4(), mw5())
  })

  it('Should be a read-only', () => {
    expect(() => {
      app.get('/path/1', mw(), (c) => {
        // @ts-expect-error
        c.var.echo = 'hello'
        return c.text(c.var.echo('hello'))
      })
    }).toThrow()
  })

  it('Should not throw a type error', (c) => {
    const app = new Hono<{
      Bindings: {
        TOKEN: string
      }
    }>()

    app.get('/', poweredBy(), async (c) => {
      expectTypeOf(c.env.TOKEN).toEqualTypeOf<string>()
    })

    app.get('/', async (c, next) => {
      expectTypeOf(c.env.TOKEN).toEqualTypeOf<string>()
      const mw = poweredBy()
      await mw(c, next)
    })

    app.use(mw())
    app.use('*', mw())

    const route = app.get('/posts', mw(), (c) => c.json(0))
    const client = hc<typeof route>('/')
    type key = keyof typeof client
    type verify = Expect<Equal<'posts', key>>
  })

  it('Should throw type errors', (c) => {
    try {
      // @ts-expect-error
      app.get(['foo', 'bar'], poweredBy())
      // @ts-expect-error
      app.use(['foo', 'bar'], poweredBy())
    } catch {}
  })
})

describe('Compatible with extended Hono classes, such Zod OpenAPI Hono.', () => {
  class ExtendedHono extends Hono {
    // @ts-ignore
    route(path: string, app?: Hono) {
      super.route(path, app)
      return this
    }
    // @ts-ignore
    basePath(path: string) {
      return new ExtendedHono(super.basePath(path))
    }
  }
  const a = new ExtendedHono()
  const sub = new Hono()
  sub.get('/foo', (c) => c.text('foo'))
  a.route('/sub', sub)

  it('Should return 200 response', async () => {
    const res = await a.request('/sub/foo')
    expect(res.status).toBe(200)
  })
})
