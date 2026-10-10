/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { expectTypeOf } from 'vitest'
import { hc } from './client'
import type { Context, ExecutionContext } from './context'
import { routePath } from './helper/route'
import { Hono } from './hono'
import { HTTPException } from './http-exception'
import { logger } from './middleware/logger'
import { poweredBy } from './middleware/powered-by'
import type { Result, Router } from './router'
import { LinearRouter } from './router/linear-router'
import { RegExpRouter } from './router/reg-exp-router'
import { SmartRouter } from './router/smart-router'
import { TrieRouter } from './router/trie-router'
import type { ErrorHandler, H, Handler, MiddlewareHandler, Next, RouterRoute } from './types'
import type { Equal, Expect } from './utils/types'
import { getPath } from './utils/url'

const METHOD_NAME_NOT_FOUND = '@NOT_FOUND'
const METHOD_NAME_ERROR = '@ERROR'

// https://stackoverflow.com/a/65666402
function throwExpression(errorMessage: string): never {
  throw new Error(errorMessage)
}

const createApp = (withUpstreamMiddleware: boolean) => {
  const app = new Hono()
  if (withUpstreamMiddleware) {
    app.use(async (_c, next) => {
      await next()
    })
  }
  return app
}

type Env = {
  Bindings: {
    _: string
  }
}

const createResponseProxy = (response: Response) => {
  return new Proxy(response, {
    get(target, prop, receiver) {
      const value = target[prop as keyof Response]
      if (typeof value === 'function') {
        return Object.defineProperties(
          function (...args: unknown[]) {
            // @ts-expect-error: `this` context is intentionally dynamic for proxy method binding
            return Reflect.apply(value, this === receiver ? target : this, args)
          },
          {
            name: { value: value.name },
            length: { value: value.length },
          }
        )
      }
      return value
    },
  })
}

describe('GET Request', () => {
  describe('without middleware', () => {
    // In other words, this is a test for cases that do not use `compose()`

    const app = new Hono<Env>()

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

    app.get('/proxy-object', () => createResponseProxy(new Response('proxy')))

    app.get('/async-proxy-object', async () => createResponseProxy(new Response('proxy')))

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

    const app = new Hono<Env>()

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

    app.get('/proxy-object', () => createResponseProxy(new Response('proxy')))

    app.get('/async-proxy-object', async () => createResponseProxy(new Response('proxy')))

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

    it('GET http://localhost/anything is not found', async () => {
      const res = await app.request('/anything')
      expect(res.status).toBe(404)
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

describe('Options', () => {
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

  it('Should not modify the options passed to it', () => {
    const options = { strict: true }
    const clone = structuredClone(options)
    const app = new Hono(clone)
    expect(clone).toEqual(options)
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

  it('Should match a suffix wildcard after falling back to TrieRouter', async () => {
    const app = new Hono()
    const sub = new Hono()
    sub.post('/items', (c) => c.text('items'))
    sub.post('/:slug', (c) => c.text('slug'))
    app.route('/api', sub)
    app.get('/assets*', (c) => c.text('asset'))

    const res = await app.request('http://localhost/assets/app.js')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('asset')
    expect(app.router.name).toBe('SmartRouter + TrieRouter')
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

  describe('Nested route - basePath of the mounted routes', () => {
    it('Should set basePath to the mount path', () => {
      const app = new Hono()
      const sub = new Hono()
      sub.get('/posts/:id', (c) => c.text('post'))
      app.route('/:sub', sub)

      expect(app.routes).toEqual([
        {
          basePath: '/:sub',
          depth: 1,
          method: 'GET',
          path: '/:sub/posts/:id',
          handler: expect.any(Function),
        },
      ])
    })

    it('Should accumulate basePath through nested route() calls', () => {
      const app = new Hono()
      const sub1 = new Hono()
      const sub2 = new Hono()
      sub2.get('/posts/:id', (c) => c.text('post'))
      sub1.route('/:sub2', sub2)
      app.route('/:sub1', sub1)

      expect(app.routes).toEqual([
        {
          basePath: '/:sub1/:sub2',
          depth: 2,
          method: 'GET',
          path: '/:sub1/:sub2/posts/:id',
          handler: expect.any(Function),
        },
      ])
    })

    it('Should merge the basePath of a subApp created with basePath()', () => {
      const app = new Hono()
      const sub = new Hono().basePath('/book')
      sub.get('/:id', (c) => c.text('book'))
      app.route('/api', sub)

      expect(app.routes).toEqual([
        {
          basePath: '/api/book',
          depth: 1,
          method: 'GET',
          path: '/api/book/:id',
          handler: expect.any(Function),
        },
      ])
    })
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

  describe('Encoded path', () => {
    let app: Hono
    beforeEach(() => {
      app = new Hono()
    })

    it('should decode path parameter', async () => {
      app.get('/users/:id', (c) => c.text(`id is ${c.req.param('id')}`))

      const res = await app.request('http://localhost/users/%C3%A7awa%20y%C3%AE%3F')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('id is çawa yî?')
    })

    it('should decode "/"', async () => {
      app.get('/users/:id', (c) => c.text(`id is ${c.req.param('id')}`))

      const res = await app.request('http://localhost/users/hono%2Fposts') // %2F is '/'
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('id is hono/posts')
    })

    it('should decode alphabets', async () => {
      app.get('/users/static', (c) => c.text('static'))

      const res = await app.request('http://localhost/users/%73tatic') // %73 is 's'
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('static')
    })

    it('should decode alphabets with invalid UTF-8 sequence', async () => {
      app.get('/static/:path', (c) => {
        return c.text(`by c.req.param: ${c.req.param('path')}`)
      })

      const res = await app.request('http://localhost/%73tatic/%A4%A2') // %73 is 's', %A4%A2 is invalid UTF-8 sequence
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('by c.req.param: %A4%A2')
    })

    it('should decode alphabets with invalid percent encoding', async () => {
      app.get('/static/:path', (c) => {
        return c.text(`by c.req.param: ${c.req.param('path')}`)
      })

      const res = await app.request('http://localhost/%73tatic/%a') // %73 is 's', %a is invalid percent encoding
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('by c.req.param: %a')
    })

    it('should not double decode', async () => {
      app.get('/users/:id', (c) => c.text(`posts of ${c.req.param('id')}`))

      const res = await app.request('http://localhost/users/%2525') // %25 is '%'
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('posts of %25')
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
      return c.text(`q is ${q?.[0]} and ${q?.[1]}, limit is ${limit?.[0]}`)
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

    app.get('/error-string', () => {
      throw 'This is Error'
    })

    app.use('/error-middleware', async () => {
      throw new Error('This is Middleware Error')
    })

    app.onError((c) => {
      c.header('x-debug', c.error!.message)
      return c.text('Custom Error Message', 500)
    })

    it('Should handle a non-Error value thrown in a handler', async () => {
      const res = await app.request('/error-string')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('Custom Error Message')
      expect(res.headers.get('x-debug')).toBe('This is Error')
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

  it.each(['sync', 'async'])(
    'Should pass a non-Error value thrown from a %s handler to onError as an Error cause',
    async (mode) => {
      const app = new Hono()
      const handler = () => {
        throw null
      }
      app.get('/', mode === 'async' ? async () => handler() : handler)
      const onError = vi.fn(async (c: Context) => c.text('Custom Error Message', 500))
      app.onError(onError)

      const res = await app.request('/')

      expect(onError).toHaveBeenCalledOnce()
      const [context] = onError.mock.calls[0]
      const error = context.error!
      expect(error).toBeInstanceOf(Error)
      expect(error.cause).toBe(null)
      expect(error.message).toBe('')
      expect(context.error).toBe(error)
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('Custom Error Message')
    }
  )

  it('Should return a default 500 response for a non-Error throw', async () => {
    const app = new Hono()
    app.get('/', () => {
      throw { message: 'Unexpected error' }
    })

    const res = await app.request('/')

    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Internal Server Error')
  })

  it('Should resume middleware after a non-Error throw', async () => {
    const app = new Hono()
    app.use(async (c, next) => {
      await next()
      c.header('x-after-next', 'executed')
    })
    app.get('/', () => {
      throw { message: 'Unexpected error' }
    })

    const res = await app.request('/')

    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Internal Server Error')
    expect(res.headers.get('x-after-next')).toBe('executed')
  })

  it('Should use the sub-app onError for a non-Error throw', async () => {
    const app = new Hono()
    const sub = new Hono()
    const value = { message: 'Sub-app error' }
    const onError = vi.fn((c: Context) => c.text('Parent error', 500))
    const subOnError = vi.fn((c: Context) => c.text('Sub-app error', 500))
    app.onError(onError)
    app.use(async (c, next) => {
      await next()
      c.header('x-after-next', 'executed')
    })
    sub.onError(subOnError)
    sub.get('/', async () => {
      throw value
    })
    app.route('/sub', sub)

    const res = await app.request('/sub')

    expect(onError).not.toHaveBeenCalled()
    expect(subOnError).toHaveBeenCalledOnce()
    const [context] = subOnError.mock.calls[0]
    const error = context.error!
    expect(error).toBeInstanceOf(Error)
    expect(error.cause).toBe(value)
    expect(context.error).toBe(error)
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Sub-app error')
    expect(res.headers.get('x-after-next')).toBe('executed')
  })

  it('Should handle a non-Error throw from notFound', async () => {
    const app = new Hono()
    app.use(async () => {})
    app.notFound(() => {
      throw 'Not Found error'
    })
    app.onError((c) => c.text(c.error!.message, 500))

    const res = await app.request('/')

    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Not Found error')
  })

  it('Should set c.error when notFound throws with no matched route', async () => {
    const app = new Hono()
    const error = new Error('This is Error')
    app.notFound(() => {
      throw error
    })
    let errorInContext: Error | undefined
    app.onError((c) => {
      errorInContext = c.error
      return c.text('Custom Error Message', 500)
    })

    const res = await app.request('/')

    expect(res.status).toBe(500)
    expect(errorInContext).toBe(error)
  })

  describe('Async custom handler', () => {
    const app = new Hono()

    app.get('/error', () => {
      throw new Error('This is Error')
    })

    app.use('/error-middleware', async () => {
      throw new Error('This is Middleware Error')
    })

    app.onError(async (c) => {
      const promise = new Promise((resolve) =>
        setTimeout(() => {
          resolve('Promised')
        }, 1)
      )
      const message = (await promise) as string
      c.header('x-debug', c.error!.message)
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

    app2.onError((c) => {
      if (c.error instanceof HTTPException && c.error.status === 401) {
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

  describe('Handle HTTPException like object', () => {
    const app = new Hono()

    class CustomError extends Error {
      getResponse() {
        return new Response('Custom Error', { status: 400 })
      }
    }

    app.get('/exception', () => {
      throw new CustomError()
    })

    it('Should return 401 response', async () => {
      const res = await app.request('http://localhost/exception')
      expect(res.status).toBe(400)
      expect(await res.text()).toBe('Custom Error')
    })
  })

  describe('HTTPException with finally block', () => {
    const app = new Hono()
    app.use(async (c) => {
      try {
        throw new Error()
      } catch (cause) {
        throw new HTTPException(302, {
          cause,
          res: c.redirect('/?error=invalid_request', 302),
        })
      } finally {
        c.header('x-custom', 'custom message')
      }
    })
    it('Should have the custom header', async () => {
      const res = await app.request('http://localhost/')
      expect(res.status).toBe(302)
      expect(res.headers.get('x-custom')).toBe('custom message')
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

    app.onError((c) => {
      return c.text(c.error!.message, 400)
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

    app.onError((c) => {
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

    sub.onError((c) => {
      return c.text('onError by sub', 500)
    })

    app.route('/sub', sub)

    it('GET /posts/123 for sub', async () => {
      const res = await app.request('https://example.com/sub/posts/123')
      expect(res.status).toBe(200)
      expect(res.headers.get('handler-chain')).toBe('1')
      expect(await res.text()).toBe('post: 123')
    })

    it('should use the path-matched sub-app even for errors from parent middleware', async () => {
      const res = await app.request('https://example.com/sub/ok?app-error=1')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('onError by sub')
    })

    it('should use the parent handler outside the sub-app path', async () => {
      const res = await app.request('/other?app-error=1')
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

    sub.onError((c) => {
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

  describe('onError middleware', () => {
    it.each([RegExpRouter, TrieRouter])(
      'Should compose scoped middleware and a global fallback independently of the HTTP method with %s',
      async (Router) => {
        const app = new Hono({ router: new Router() })
        const setLanguage: MiddlewareHandler<{ Variables: { language: string } }> = async (
          c,
          next
        ) => {
          c.set('language', 'en')
          await next()
          c.header('x-language', c.var.language)
        }

        app.all('*', () => {
          throw new Error('failed')
        })
        app.onError('/items/*', setLanguage, (c) =>
          c.text(`${c.var.language}: ${c.error!.message}`, 500)
        )
        app.onError('*', (c) => c.text('Fallback', 500))

        for (const method of ['GET', 'POST', 'DELETE']) {
          const res = await app.request('/items/1', { method })
          expect(res.status).toBe(500)
          expect(await res.text()).toBe('en: failed')
          expect(res.headers.get('x-language')).toBe('en')
        }
        const res = await app.request('/other')
        expect(await res.text()).toBe('Fallback')
        expect(res.headers.get('x-language')).toBeNull()
      }
    )

    it('Should scope pathless registrations to basePath without wrapping normal handlers', async () => {
      const app = new Hono()
      const api = new Hono().basePath('/api')
      const handler: Handler = (c) => c.text('OK')

      api.onError((c) => c.text(`API: ${c.error!.message}`, 500))
      api.get('/ok', handler)
      api.get('/error', () => {
        throw new Error('failed')
      })
      app.route('/', api)
      app.get('/error', () => {
        throw new Error('failed')
      })
      app.onError((c) => c.text('Fallback', 500))

      expect(app.routes.find((route) => route.path === '/api/ok')?.handler).toBe(handler)
      const res = app.request('/api/ok')
      expect(res).toBeInstanceOf(Response)
      expect(await (res as Response).text()).toBe('OK')
      expect(await (await app.request('/api/error')).text()).toBe('API: failed')
      expect(await (await app.request('/error')).text()).toBe('Fallback')
    })

    it('Should delegate to the built-in error handler when every middleware calls next()', async () => {
      const app = new Hono()
      app.onError(async (c, next) => {
        await next()
        c.header('x-error-middleware', 'true')
      })
      app.get('/error', () => {
        throw new HTTPException(401, { message: 'Unauthorized' })
      })

      const res = await app.request('/error')
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
      expect(res.headers.get('x-error-middleware')).toBe('true')
    })

    it('Should expose the middleware signature through ErrorHandler', async () => {
      const app = new Hono()
      const middleware: ErrorHandler = async (c, next) => {
        expectTypeOf(c).toEqualTypeOf<Context>()
        expectTypeOf(next).toEqualTypeOf<Next>()
        expectTypeOf(c.error).toEqualTypeOf<Error | undefined>()
        await next()
      }
      const handler: ErrorHandler = (c) => c.text(c.error!.message, 500)
      app.onError(middleware, handler)
      app.get('/error', () => {
        throw new Error('failed')
      })

      expect(await (await app.request('/error')).text()).toBe('failed')

      // @ts-expect-error The legacy (error, context) signature is no longer accepted.
      new Hono().onError((error: Error, c: Context) => c.text(error.message, 500))
    })

    it('Should run nested application middleware before parent middleware', async () => {
      const app = new Hono()
      const sub = new Hono()
      const nested = new Hono()
      const calls: string[] = []

      app.onError(async (_c, next) => {
        calls.push('app')
        await next()
      })
      sub.onError(async (_c, next) => {
        calls.push('sub')
        await next()
      })
      nested.onError(async (c) => {
        calls.push('nested')
        return c.text(c.error!.message, 500)
      })
      nested.get('/error', () => {
        throw new Error('Error')
      })
      sub.route('/', nested)
      app.route('/', sub)

      const res = await app.request('/error')
      expect(await res.text()).toBe('Error')
      expect(calls).toEqual(['nested'])
    })

    it('Should continue through parent application middleware', async () => {
      const app = new Hono()
      const sub = new Hono()
      const calls: string[] = []

      app.onError(async (c) => {
        calls.push('app')
        return c.text(c.error!.message, 500)
      })
      sub.onError(async (_c, next) => {
        calls.push('sub')
        await next()
      })
      sub.get('/error', () => {
        throw new Error('Error')
      })
      app.route('/', sub)

      const res = await app.request('/error')
      expect(await res.text()).toBe('Error')
      expect(calls).toEqual(['sub', 'app'])
    })

    it('Should scope error middleware by path', async () => {
      const app = new Hono()
      const api = new Hono()

      api.onError(
        '/items/*',
        async (c, next) => {
          await next()
          c.header('x-error-scope', 'items')
        },
        async (c) => c.text(`items: ${c.error!.message}`, 500)
      )
      api.get('/items/:id', () => {
        throw new Error('failed')
      })
      api.get('/other', () => {
        throw new Error('failed')
      })
      app.route('/api', api)
      app.onError((c) => c.text(`app: ${c.error!.message}`, 500))

      let res = await app.request('/api/items/1')
      expect(res.headers.get('x-error-scope')).toBe('items')
      expect(await res.text()).toBe('items: failed')

      res = await app.request('/api/other')
      expect(res.headers.get('x-error-scope')).toBeNull()
      expect(await res.text()).toBe('app: failed')
    })

    it('Should compose separate registrations within a sub-application', async () => {
      const app = new Hono()
      const api = new Hono()
      const calls: string[] = []

      api.onError(async (_c, next) => {
        calls.push('middleware')
        await next()
      })
      api.onError((c) => {
        calls.push('onError')
        return c.text(c.error!.message, 500)
      })
      api.get('/error', () => {
        throw new Error('Error')
      })
      app.route('/api', api)

      const res = await app.request('/api/error')
      expect(await res.text()).toBe('Error')
      expect(calls).toEqual(['middleware', 'onError'])
    })

    it('Should replace a response when a sub-application throws after next()', async () => {
      const app = new Hono()
      const api = new Hono()

      api.use(async (_c, next) => {
        await next()
        throw new Error('Error after response')
      })
      api.get('/item', (c) => c.text('Item'))
      api.onError((c) => c.text(c.error!.message, 500))
      app.route('/api', api)

      const res = await app.request('/api/item')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('Error after response')
    })

    it('Should compose multiple registrations in order', async () => {
      const app = new Hono()
      const calls: string[] = []

      app.onError(async (c, next) => {
        calls.push(`before:${c.req.param('id')}:${c.error?.message}`)
        await next()
        calls.push(`after:${c.req.param('id')}`)
        c.res.headers.set('x-error-middleware', 'true')
      })
      app.onError(async (_c, next) => {
        calls.push('second')
        await next()
      })
      app.onError((c) => {
        calls.push('handler')
        return c.text(c.error!.message, 500)
      })

      app.get('/posts/:id', () => {
        throw new Error('This is Error')
      })

      const res = await app.request('https://example.com/posts/123')
      expect(res.status).toBe(500)
      expect(res.headers.get('x-error-middleware')).toBe('true')
      expect(await res.text()).toBe('This is Error')
      expect(calls).toEqual(['before:123:This is Error', 'second', 'handler', 'after:123'])
    })

    it('Should infer variables from middleware', async () => {
      const setMessage: MiddlewareHandler<{
        Variables: { message: string }
      }> = async (c, next) => {
        c.set('message', 'Caught')
        await next()
      }
      const app = new Hono()
        .onError(setMessage, async (c) => c.text(c.var.message, 500))
        .get('/error', () => {
          throw new Error('Error')
        })

      expect(await (await app.request('/error')).text()).toBe('Caught')
    })

    it('Should replace an existing response', async () => {
      const app = new Hono()

      app.use(async (_c, next) => {
        await next()
        throw new Error('Error after response')
      })
      app.get('/posts/:id', (c) => c.text('OK'))
      app.onError(async (_c, next) => {
        await next()
      })
      app.onError((c) => c.text(c.error!.message, 500))

      const res = await app.request('https://example.com/posts/123')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('Error after response')
    })

    it.each([false, true])(
      'Should preserve explicit error response headers with upstream middleware: %s',
      async (withMiddleware) => {
        const app = createApp(withMiddleware)
        app.get('/', (c) => {
          c.header('Cache-Control', 'public, max-age=3600')
          c.header('Set-Cookie', 'session=old')
          c.header('x-request', 'kept')
          throw new Error('Failed')
        })
        app.onError(async (c, next) => {
          c.header('x-error', 'handled')
          await next()
        })
        app.onError((c) =>
          c.text(c.error!.message, 500, {
            'Cache-Control': 'no-store',
            'Set-Cookie': ['session=new', 'error=1'],
          })
        )

        const res = await app.request('/')
        expect(res.status).toBe(500)
        expect(await res.text()).toBe('Failed')
        expect(res.headers.get('Cache-Control')).toBe('no-store')
        expect(res.headers.getSetCookie()).toEqual(['session=new', 'error=1'])
        expect(res.headers.get('x-request')).toBe('kept')
        expect(res.headers.get('x-error')).toBe('handled')
      }
    )

    it('Should preserve explicit headers on a raw error response', async () => {
      const app = new Hono()
      app.get('/', (c) => {
        c.header('Cache-Control', 'public, max-age=3600')
        c.header('Set-Cookie', 'session=old')
        throw new Error('Failed')
      })
      app.onError(
        () =>
          new Response('Failed', {
            status: 500,
            headers: { 'Cache-Control': 'no-store', 'Set-Cookie': 'session=new' },
          })
      )

      const res = await app.request('/')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('Failed')
      expect(res.headers.get('Cache-Control')).toBe('no-store')
      expect(res.headers.getSetCookie()).toEqual(['session=new'])
    })

    it.each([false, true])(
      'Should return Response.error() from error middleware with upstream middleware: %s',
      async (withMiddleware) => {
        const app = createApp(withMiddleware)
        const response = Response.error()
        app.onError(() => response)
        app.get('/', () => {
          throw new Error('Failed')
        })

        expect(await app.request('/')).toBe(response)
      }
    )

    it('Should allow error middleware to edit immutable response headers before next()', async () => {
      const app = new Hono()
      const redirect = Response.redirect('http://localhost/redirect')

      app.use(async (_c, next) => {
        await next()
        throw new Error('Error after redirect')
      })
      app.get('/', () => redirect)
      app.onError(async (c, next) => {
        c.header('location', undefined)
        c.header('x-error', 'handled')
        await next()
      })
      app.onError((c) => c.text(c.error!.message, 500))

      const res = await app.request('/')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('Error after redirect')
      expect(res.headers.get('x-error')).toBe('handled')
      expect(res.headers.has('location')).toBe(false)
      expect(redirect.headers.get('location')).toBe('http://localhost/redirect')
    })

    it.each(['consumed', 'locked'])(
      'Should handle errors when the existing response body is %s',
      async (state) => {
        const app = new Hono()
        let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
        app.use(async (c, next) => {
          await next()
          if (state === 'consumed') {
            expect(await c.res.text()).toBe('OK')
          } else {
            reader = c.res.body!.getReader()
          }
          throw new Error('Error after response')
        })
        app.get('/', (c) => c.text('OK'))
        app.onError((c) => c.text(c.error!.message, 500))

        try {
          const res = await app.request('/')
          expect(res.status).toBe(500)
          expect(await res.text()).toBe('Error after response')
        } finally {
          reader?.releaseLock()
        }
      }
    )

    it('Should allow middleware to return a response', async () => {
      const app = new Hono()

      app.onError(async (c) => c.text(`Caught: ${c.error!.message}`, 500))
      app.onError((c) => c.text('Fallback Error', 500))
      app.get('/error', () => {
        throw new Error('Error')
      })

      const res = await app.request('/error')
      expect(await res.text()).toBe('Caught: Error')
    })

    it('Should use the built-in handler if error middleware throws, without restarting the chain', async () => {
      const app = new Hono()
      const error = new Error('Error in onError')
      const log = vi.spyOn(console, 'error').mockImplementation(() => {})
      const handler = vi.fn(() => {
        throw error
      })
      const fallback = vi.fn((c: Context) => c.text('Fallback', 500))

      app.onError(handler)
      app.onError(fallback)
      app.get('/error', () => {
        throw new Error('Original error')
      })

      const res = await app.request('/error')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('Internal Server Error')
      expect(handler).toHaveBeenCalledTimes(1)
      expect(fallback).not.toHaveBeenCalled()
      expect(log).toHaveBeenCalledExactlyOnceWith(error)
      log.mockRestore()
    })

    it('Should stop at the first responding handler instead of replacing earlier registrations', async () => {
      const app = new Hono()

      app.onError((c) => c.text('First', 500))
      app.onError((c) => c.text('Second', 500))
      app.get('/error', () => {
        throw new Error('Error')
      })

      expect(await (await app.request('/error')).text()).toBe('First')
    })

    it('Should preserve the route that threw after next()', async () => {
      const app = new Hono()

      app.use('/posts/*', async (_c, next) => {
        await next()
        throw new Error('Error after next')
      })
      app.get('/posts/:id', (c) => c.text('OK'))
      app.onError((c) =>
        c.json(
          {
            message: c.error!.message,
            param: c.req.param('id'),
            routePath: routePath(c),
          },
          500
        )
      )

      const res = await app.request('https://example.com/posts/123')
      expect(res.status).toBe(500)
      expect(await res.json()).toEqual({
        message: 'Error after next',
        param: undefined,
        routePath: '/posts/*',
      })
    })
  })

  describe('notFound', () => {
    const app = new Hono()
    const sub = new Hono()

    app.get('/explicit-404', async (c) => {
      c.header('explicit', '1')
    })

    app.get('/sub/not-found-from-app', (c) => c.notFound())

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

    it('/sub/explicit-404 should be handled by sub as an implicit 404', async () => {
      const res = await app.request('https://example.com/sub/explicit-404')
      expect(res.status).toBe(404)
      expect(res.headers.get('explicit')).toBe('1')
      expect(await res.text()).toBe('404 Not Found by sub')
    })

    it('c.notFound() should prefer the matching sub-app scope over the original route owner', async () => {
      const res = await app.request('https://example.com/sub/not-found-from-app')
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('404 Not Found by sub')
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
      expect(await res.text()).toBe('404 Not Found by sub')
    })

    it('Should preserve route metadata and resume upstream middleware for c.notFound()', async () => {
      const app = new Hono()
      const sub = new Hono()

      app.use('*', async (c, next) => {
        try {
          await next()
          c.header('x-after-next', 'true')
        } catch {
          return c.text('caught', 500)
        }
      })
      sub.get('/posts/:id', (c) => c.notFound())
      sub.notFound(async (c) => c.text(`sub: ${c.req.param('id')}`, 404))
      app.route('/sub', sub)

      const res = await app.request('/sub/posts/123')
      expect(res.status).toBe(404)
      expect(res.headers.get('x-after-next')).toBe('true')
      expect(await res.text()).toBe('sub: 123')
    })

    it('Should preserve cached RegExpRouter matches across fallback dispatches', async () => {
      const errorApp = new Hono({ router: new RegExpRouter() })
      let handlerCalls = 0
      errorApp.all('/error', () => {
        handlerCalls++
        throw new HTTPException(500)
      })

      let res = await errorApp.request('/error')
      expect(res.status).toBe(500)
      res = await errorApp.request('/error')
      expect(res.status).toBe(500)
      expect(handlerCalls).toBe(2)

      const notFoundApp = new Hono({ router: new RegExpRouter() })
      let middlewareCalls = 0
      notFoundApp.use('/missing', async (_c, next) => {
        middlewareCalls++
        await next()
      })

      res = await notFoundApp.request('/missing')
      expect(res.status).toBe(404)
      res = await notFoundApp.request('/missing')
      expect(res.status).toBe(404)
      expect(middlewareCalls).toBe(2)
    })

    it('Should terminate recursive error and not-found dispatches', async () => {
      const app = new Hono()
      const log = vi.spyOn(console, 'error').mockImplementation(() => {})
      app.notFound(() => {
        throw new Error('not found error')
      })
      app.onError((c) => c.notFound())

      const res = await app.request('/')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('Internal Server Error')
      expect(log).toHaveBeenCalledTimes(1)
      log.mockRestore()
    })
  })

  describe('notFound middleware', () => {
    it.each(['/missing', '/explicit'])(
      'Should preserve explicit not-found response headers for %s',
      async (path) => {
        const app = new Hono()
        app.use(async (c, next) => {
          c.header('Cache-Control', 'public, max-age=3600')
          c.header('Set-Cookie', 'session=old')
          c.header('x-request', 'kept')
          await next()
        })
        app.get('/explicit', (c) => c.notFound())
        app.notFound(async (c, next) => {
          await next()
          c.header('x-not-found', 'handled')
        })
        app.notFound((c) =>
          c.text('Not found', 404, {
            'Cache-Control': 'no-store',
            'Set-Cookie': ['session=new', 'missing=1'],
          })
        )

        const res = await app.request(path)
        expect(res.status).toBe(404)
        expect(await res.text()).toBe('Not found')
        expect(res.headers.get('Cache-Control')).toBe('no-store')
        expect(res.headers.getSetCookie()).toEqual(['session=new', 'missing=1'])
        expect(res.headers.get('x-request')).toBe('kept')
        expect(res.headers.get('x-not-found')).toBe('handled')
      }
    )

    it('Should allow header edits after adopting an immutable not-found response', async () => {
      const app = new Hono()
      const redirect = Response.redirect('http://localhost/redirect')
      app.notFound(() => redirect)
      app.get('/', async (c) => {
        const res = await c.notFound()
        expect(c.finalized).toBe(false)
        c.res = res
        c.header('x-after-not-found', 'handled')
        return c.res
      })

      const res = await app.request('/')
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('http://localhost/redirect')
      expect(res.headers.get('x-after-not-found')).toBe('handled')
      expect(redirect.headers.has('x-after-not-found')).toBe(false)
    })

    it.each([false, true])(
      'Should return Response.error() from not-found middleware with upstream middleware: %s',
      async (withMiddleware) => {
        const app = createApp(withMiddleware)
        const response = Response.error()
        app.notFound(() => response)
        app.get('/explicit', (c) => c.notFound())

        expect(await app.request('/missing')).toBe(response)
        expect(await app.request('/explicit')).toBe(response)
      }
    )

    it.each([false, true])(
      'Should preserve wrapper headers around c.notFound() with upstream middleware: %s',
      async (withMiddleware) => {
        const app = createApp(withMiddleware)
        app.notFound((c) =>
          c.text('Missing', 404, { 'Cache-Control': 'public', 'Set-Cookie': 'session=old' })
        )
        app.get('/', async (c) => {
          const res = await c.notFound()
          return new Response(res.body, {
            status: 410,
            headers: { 'Cache-Control': 'no-store', 'Set-Cookie': 'session=new' },
          })
        })

        const res = await app.request('/')
        expect(res.status).toBe(410)
        expect(await res.text()).toBe('Missing')
        expect(res.headers.get('Cache-Control')).toBe('no-store')
        expect(res.headers.getSetCookie()).toEqual(['session=new'])
      }
    )

    it('Should not retain a discarded not-found response in the context', async () => {
      const app = new Hono()
      app.notFound((c) => c.text('Missing', 404, { 'x-not-found': 'discarded' }))
      app.get('/', async (c) => {
        await c.notFound()
        expect(c.finalized).toBe(false)
        return c.text('OK')
      })

      const res = await app.request('/')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('OK')
      expect(res.headers.has('x-not-found')).toBe(false)
    })

    it.each([false, true])(
      'Should allow wrapping c.notFound() with upstream middleware: %s',
      async (withMiddleware) => {
        const app = createApp(withMiddleware)
        app.notFound(async (c, next) => {
          await next()
          expect(c.finalized).toBe(true)
          c.header('x-not-found', 'handled')
        })
        app.get('/', async (c) => {
          const res = await c.notFound()
          expect(c.finalized).toBe(false)
          return new Response(res.clone().body, { status: 410, headers: res.headers })
        })

        const res = await app.request('/')
        expect(res.status).toBe(410)
        expect(await res.text()).toBe('404 Not Found')
        expect(res.headers.get('x-not-found')).toBe('handled')
      }
    )

    it('Should preserve an already finalized context after c.notFound()', async () => {
      const app = new Hono()
      app.notFound(async (_c, next) => {
        await next()
      })
      app.get('/', async (c) => {
        const prepared = c.text('Prepared', 202)
        c.res = prepared
        const res = await c.notFound()
        expect(c.finalized).toBe(true)
        expect(c.res).toBe(prepared)
        return res
      })

      expect((await app.request('/')).status).toBe(404)
    })

    it('Should allow not-found middleware to edit an existing immutable response', async () => {
      const app = new Hono()
      const redirect = Response.redirect('http://localhost/redirect')
      app.notFound(async (c, next) => {
        c.header('location', undefined)
        c.header('x-not-found', 'handled')
        await next()
      })
      app.get('/', async (c) => {
        c.res = redirect
        const res = await c.notFound()
        expect(c.finalized).toBe(true)
        return res
      })

      const res = await app.request('/')
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('404 Not Found')
      expect(res.headers.get('x-not-found')).toBe('handled')
      expect(res.headers.has('location')).toBe(false)
      expect(redirect.headers.get('location')).toBe('http://localhost/redirect')
    })

    it('Should preserve an unfinalized response after c.notFound()', async () => {
      const app = new Hono()
      app.notFound((c) => {
        c.header('x-not-found', 'temporary')
        return c.text('Missing', 404)
      })
      app.get('/', async (c) => {
        const original = c.res
        original.headers.set('x-original', 'kept')
        await c.notFound()
        expect(c.finalized).toBe(false)
        expect(c.res).toBe(original)
        return c.text('OK')
      })

      const res = await app.request('/')
      expect(res.status).toBe(200)
      expect(res.headers.get('x-original')).toBe('kept')
      expect(res.headers.has('x-not-found')).toBe(false)
    })

    it('Should restore response state when not-found middleware rejects while handling an error', async () => {
      const app = new Hono()
      app.use(async (_c, next) => {
        await next()
      })
      app.notFound(async (c, next) => {
        await next()
        c.header('x-not-found', 'discarded')
        throw 'Not-found failure'
      })
      app.get('/', async (c) => {
        c.error = new Error('Original error')
        await expect(c.notFound()).rejects.toThrow('Not-found failure')
        expect(c.finalized).toBe(false)
        return c.text('Recovered', 410)
      })

      const res = await app.request('/')
      expect(res.status).toBe(410)
      expect(await res.text()).toBe('Recovered')
      expect(res.headers.has('x-not-found')).toBe(false)
    })

    it('Should restore an existing response when not-found middleware rejects while handling an error', async () => {
      const app = new Hono()
      app.notFound(async (c, next) => {
        c.header('x-not-found', 'discarded')
        await next()
        throw 'Not-found failure'
      })
      app.get('/', async (c) => {
        const original = c.text('Prepared', 202)
        c.res = original
        c.error = new Error('Original error')
        await expect(c.notFound()).rejects.toThrow('Not-found failure')
        expect(c.finalized).toBe(true)
        expect(c.res).toBe(original)
        return c.res
      })

      const res = await app.request('/')
      expect(res.status).toBe(202)
      expect(await res.text()).toBe('Prepared')
      expect(res.headers.has('x-not-found')).toBe(false)
    })

    it.each([false, true])(
      'Should handle non-Error throws from not-found middleware with upstream middleware: %s',
      async (withMiddleware) => {
        const app = createApp(withMiddleware)
        app.notFound(async (_c, next) => {
          await next()
          throw 'Not-found failure'
        })
        app.onError((c) => {
          expect(c.error).toBeInstanceOf(Error)
          expect(c.error!.cause).toBe('Not-found failure')
          return c.text(c.error!.message, 500)
        })
        app.get('/explicit', async (c) => {
          const original = c.res
          const res = await c.notFound()
          expect(c.finalized).toBe(false)
          expect(c.res).toBe(original)
          return res
        })

        for (const path of ['/missing', '/explicit']) {
          const res = await app.request(path)
          expect(res.status).toBe(500)
          expect(await res.text()).toBe('Not-found failure')
        }
      }
    )

    it('Should allow error middleware to wrap c.notFound()', async () => {
      const app = new Hono()
      app.notFound(async (_c, next) => {
        await next()
      })
      app.onError(async (c) => {
        const res = await c.notFound()
        return new Response(res.body, { status: 503 })
      })
      app.get('/', () => {
        throw new Error('Route error')
      })

      const res = await app.request('/')
      expect(res.status).toBe(503)
      expect(await res.text()).toBe('404 Not Found')
    })

    it.each([
      ['RegExpRouter', RegExpRouter],
      ['TrieRouter', TrieRouter],
    ] as const)(
      'Should handle not-found middleware errors before resuming upstream middleware with %s',
      async (_name, Router) => {
        const app = new Hono({ router: new Router() })
        const caught = vi.fn()
        const calls: string[] = []
        app.use(async (c, next) => {
          try {
            await next()
            calls.push('upstream')
          } catch (error) {
            caught(error)
            return c.text('Intercepted', 503)
          }
        })
        app.notFound(
          async (c, next) => {
            await next()
            calls.push('not-found')
            c.header('x-not-found', 'handled')
          },
          () => {
            throw new Error('Not-found error')
          }
        )
        app.onError((c) => {
          calls.push('error')
          return c.text(c.error!.message, 500)
        })
        app.get('/explicit', (c) => c.notFound())

        for (const path of ['/missing', '/explicit']) {
          calls.length = 0
          const res = await app.request(path)
          expect(res.status).toBe(500)
          expect(await res.text()).toBe('Not-found error')
          expect(res.headers.get('x-not-found')).toBe('handled')
          expect(calls).toEqual(['error', 'not-found', 'upstream'])
          expect(caught).not.toHaveBeenCalled()
        }
      }
    )

    it('Should not re-enter error middleware when it invokes failing not-found middleware', async () => {
      const app = new Hono()
      const error = new HTTPException(503, { message: 'Not-found error' })
      const notFound = vi.fn(() => {
        throw error
      })
      const onError = vi.fn((c: Context) => c.notFound())
      app.notFound(notFound)
      app.onError(onError)

      const res = await app.request('/missing')
      expect(res.status).toBe(503)
      expect(await res.text()).toBe('Not-found error')
      expect(notFound).toHaveBeenCalledTimes(2)
      expect(onError).toHaveBeenCalledTimes(1)
    })

    it('Should compose middleware with synchronous handlers for implicit and explicit not found', async () => {
      const app = new Hono()
      app.notFound(
        '/items/*',
        async (c, next) => {
          await next()
          c.header('x-not-found', 'items')
        },
        (c) => c.text('Items Not Found', 404)
      )
      app.notFound((c) => c.text('Fallback Not Found', 404))
      app.get('/items/explicit', (c) => c.notFound())

      for (const path of ['/items/missing', '/items/explicit']) {
        const res = await app.request(path)
        expect(res.status).toBe(404)
        expect(await res.text()).toBe('Items Not Found')
        expect(res.headers.get('x-not-found')).toBe('items')
      }
      expect(await (await app.request('/other')).text()).toBe('Fallback Not Found')
    })

    it('Should run nested application middleware before parent middleware', async () => {
      const app = new Hono()
      const sub = new Hono()

      app.notFound(async (c) => c.text('App Not Found', 404))
      sub.notFound(async (c) => c.text('Sub Not Found', 404))
      app.route('/', sub)

      const res = await app.request('/missing')
      expect(await res.text()).toBe('Sub Not Found')
    })

    it('Should scope not-found middleware by path', async () => {
      const app = new Hono()

      app.notFound('/items/*', async (c) => c.text('Items Not Found', 404))
      app.notFound((c) => c.text('App Not Found', 404))

      let res = await app.request('/items/missing')
      expect(await res.text()).toBe('Items Not Found')

      res = await app.request('/other')
      expect(await res.text()).toBe('App Not Found')
    })

    it('Should compose middleware and a final handler across multiple registrations', async () => {
      const app = new Hono()
      const calls: string[] = []

      app.notFound(async (c, next) => {
        calls.push(`before:${c.req.param('id')}`)
        await next()
        calls.push(`after:${c.req.param('id')}`)
        c.res.headers.set('x-not-found-middleware', 'true')
      })
      app.notFound(async (_c, next) => {
        calls.push('second')
        await next()
      })
      app.notFound((c) => {
        calls.push('handler')
        return c.text('Custom Not Found', 404)
      })

      app.get('/posts/:id', (c) => c.notFound())

      const res = await app.request('https://example.com/posts/123')
      expect(res.status).toBe(404)
      expect(res.headers.get('x-not-found-middleware')).toBe('true')
      expect(await res.text()).toBe('Custom Not Found')
      expect(calls).toEqual(['before:123', 'second', 'handler', 'after:123'])
    })

    it('Should allow middleware to return a response', async () => {
      const app = new Hono()

      app.notFound(async (c) => c.text('Middleware Not Found', 404))
      app.notFound((c) => c.text('Handler Not Found', 404))

      const res = await app.request('https://example.com/missing')
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('Middleware Not Found')
    })

    it('Should pass errors thrown by middleware to the error middleware', async () => {
      const app = new Hono()

      app.notFound(async () => {
        throw new Error('Error in notFound')
      })
      app.onError(async (c) => c.text(c.error!.message, 500))

      const res = await app.request('/missing')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('Error in notFound')
    })

    it('Should compose path-matched fallback routes in registration order', async () => {
      const app = new Hono()
      const api = app.basePath('/api')
      const tenant = app.basePath('/:tenant')

      api.notFound(async (c) => c.text('API Not Found', 404))
      tenant.notFound(async (c) => c.text('Tenant Not Found', 404))
      app.notFound((c) => c.text('App Not Found', 404))
      api.get('/missing', (c) => c.notFound())
      tenant.get('/missing', (c) => c.notFound())
      app.get('/api/from-app', (c) => c.notFound())

      let res = await app.request('https://example.com/')
      expect(await res.text()).toBe('App Not Found')

      res = await app.request('https://example.com/api/missing')
      expect(await res.text()).toBe('API Not Found')

      res = await app.request('https://example.com/api/from-app')
      expect(await res.text()).toBe('API Not Found')

      res = await app.request('https://example.com/api/implicit')
      expect(await res.text()).toBe('API Not Found')

      res = await app.request('https://example.com/acme/missing')
      expect(await res.text()).toBe('Tenant Not Found')

      const rootFirst = new Hono()
      const rootFirstApi = rootFirst.basePath('/api')
      rootFirst.notFound(async (c) => c.text('App Not Found', 404))
      rootFirstApi.notFound(async (c) => c.text('API Not Found', 404))
      rootFirstApi.get('/missing', (c) => c.notFound())

      res = await rootFirst.request('https://example.com/api/missing')
      expect(await res.text()).toBe('App Not Found')

      const nested = new Hono()
      const parent = nested.basePath('/parent')
      const child = parent.basePath('/child')
      parent.notFound(async (c) => c.text('Parent Not Found', 404))
      nested.notFound(async (c) => c.text('Root Not Found', 404))
      child.get('/missing', (c) => c.notFound())

      res = await nested.request('https://example.com/parent/child/missing')
      expect(await res.text()).toBe('Parent Not Found')
    })

    it('Should not change the current route path', async () => {
      const app = new Hono()

      app
        .get('/a', async (_c, next) => next())
        .notFound(async (_c, next) => next())
        .onError(async (_c, next) => next())
        .get((c) => c.text('A'))

      expect(await (await app.request('/a')).text()).toBe('A')
      expect((await app.request('/b')).status).toBe(404)
    })

    it('Should stop at the first not-found handler that returns a response', async () => {
      const app = new Hono()

      app.notFound((c) => c.text('First', 404))
      app.notFound((c) => c.text('Second', 404))

      expect(await (await app.request('/missing')).text()).toBe('First')
    })
  })

  describe.each([
    ['RegExpRouter', RegExpRouter],
    ['TrieRouter', TrieRouter],
    ['LinearRouter', LinearRouter],
  ] as const)('Fallback scope parameters with %s', (_name, Router) => {
    it('Should allow absent scope parameters for implicit not found', async () => {
      const app = new Hono({ router: new Router() })
      app.notFound('/:tenant/*', (c) =>
        c.text(c.req.param('tenant')?.toUpperCase() ?? 'Unknown tenant', 404)
      )

      const res = await app.request('/acme/missing')
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('Unknown tenant')
    })

    it.each(['onError', 'notFound'] as const)(
      'Should preserve original route parameters in %s',
      async (method) => {
        const app = new Hono({ router: new Router() })
        app.get('/items/:id', (c) => {
          if (method === 'onError') {
            throw new Error('Error')
          }
          return c.notFound()
        })
        app[method]('/:scope/*', (c) => {
          expect(c.req.param('scope')).toBeUndefined()
          return c.json({ params: c.req.param(), route: routePath(c) })
        })

        const res = await app.request('/items/123')
        expect(await res.json()).toEqual({ params: { id: '123' }, route: '/items/:id' })
      }
    )
  })

  it('Should register and execute fallback handlers through the router', async () => {
    const registrations: string[] = []
    const executions: string[] = []
    const delegate = new RegExpRouter<[H, RouterRoute]>()
    const router: Router<[H, RouterRoute]> = {
      name: 'WrappingRouter',
      add(method, path, [handler, route]) {
        registrations.push(`${method} ${path}`)
        delegate.add(method, path, [
          async (c, next) => {
            executions.push(`${method} ${path}`)
            return handler(c, next)
          },
          route,
        ])
      },
      match(method, path): Result<[H, RouterRoute]> {
        return delegate.match(method, path)
      },
    }
    const app = new Hono({ router })

    app.notFound(
      async (_c, next) => {
        await next()
      },
      async (c) => c.text('Not Found', 404)
    )
    app.onError(async (_c, next) => {
      await next()
    })
    app.onError((c) => c.text(c.error!.message, 500))
    app.get('/error', () => {
      throw new Error('Error')
    })

    let res = await app.request('https://example.com/missing')
    expect(res.status).toBe(404)
    res = await app.request('https://example.com/error')
    expect(res.status).toBe(500)

    expect(registrations).toContain(`${METHOD_NAME_NOT_FOUND} /*`)
    expect(registrations).toContain(`${METHOD_NAME_ERROR} /*`)
    expect(app.routes.filter((route) => route.method[0] === '@')).toHaveLength(4)
    expect(executions.filter((entry) => entry === `${METHOD_NAME_NOT_FOUND} /*`)).toHaveLength(2)
    expect(executions.filter((entry) => entry === `${METHOD_NAME_ERROR} /*`)).toHaveLength(2)
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

describe('Using QUERY with `app.query` and `app.on`', () => {
  it('Should handle QUERY method with app.query()', async () => {
    const app = new Hono()

    app.query('/query', (c) => c.text('Accepted', 202))

    const req = new Request('http://localhost/query', {
      method: 'QUERY',
    })
    const res = await app.request(req)
    expect(res.status).toBe(202)
    expect(await res.text()).toBe('Accepted')
  })

  it('Should handle QUERY method with RegExpRouter', async () => {
    const app = new Hono({ router: new RegExpRouter() })

    app.on('QUERY', '/query', (c) => c.text('Accepted', 202))

    const req = new Request('http://localhost/query', {
      method: 'QUERY',
    })
    const res = await app.request(req)
    expect(res.status).toBe(202)
    expect(await res.text()).toBe('Accepted')
  })

  it('Should handle QUERY method with TrieRouter', async () => {
    const app = new Hono({ router: new TrieRouter() })

    app.on('QUERY', '/query', (c) => c.text('Accepted', 202))

    const req = new Request('http://localhost/query', {
      method: 'QUERY',
    })
    const res = await app.request(req)
    expect(res.status).toBe(202)
    expect(await res.text()).toBe('Accepted')
  })
})

describe('Multiple paths with one handler', () => {
  const app = new Hono()

  const paths = ['/hello', '/ja/hello', '/en/hello']
  app.on('GET', paths, (c) => {
    return c.json({
      path: c.req.path,
      routePath: routePath(c),
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

describe('Lack returning response with a single handler', () => {
  const app = new Hono()
  // @ts-expect-error it should return Response to type it
  app.get('/sync', () => {})
  app.get('/async', async () => {})

  it('Should return 404 response if lacking returning response', async () => {
    const res = await app.request('/sync')
    expect(res.status).toBe(404)
  })

  it('Should return 404 response if lacking returning response in an async handler', async () => {
    const res = await app.request('/async')
    expect(res.status).toBe(404)
  })
})

describe('Context is not finalized', () => {
  it('should throw error - lack `await next()`', async () => {
    const app = new Hono()

    // @ts-ignore
    app.use('*', () => {})
    app.get('/foo', (c) => {
      return c.text('foo')
    })
    app.onError((c) => {
      return c.text(c.error!.message, 500)
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

    // @ts-ignore
    app.get('/foo', () => {})
    app.onError((c) => {
      return c.text(c.error!.message, 500)
    })
    const res = await app.request('http://localhost/foo')
    expect(res.status).toBe(500)
    expect(await res.text()).toMatch(/^Context is not finalized/)
  })
})

describe('Parse Body', () => {
  const app = new Hono()

  app.post('/json', async (c) => {
    return c.json<{}, 200>(await c.req.parseBody(), 200)
  })
  app.post('/form', async (c) => {
    return c.json<{}, 200>(await c.req.parseBody(), 200)
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
    const customApp = new Hono()
    customApp.use('*', logger(logFn))
    customApp.notFound((c) => c.text('Custom Not Found', 404))
    const res = await customApp.request('http://localhost/custom-not-found')
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

describe('app.request()', () => {
  it('Should return response with Request and RequestInit as args', async () => {
    const app = new Hono()
    app.get('/foo', (c) => {
      return c.json(c.req.header('x-message'))
    })
    const req = new Request('http://localhost/foo')
    const headers = new Headers()
    headers.append('x-message', 'hello')
    const res = await app.request(req, {
      headers,
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('"hello"')
  })
})

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
    // @ts-expect-error The handlers are more than 10
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
          c.var.echo2('hello2') +
          c.var.echo3('hello3') +
          c.var.echo4('hello4') +
          c.var.echo5('hello5') +
          c.var.echo6('hello6') +
          c.var.echo7('hello7') +
          c.var.echo8('hello8') +
          c.var.echo9('hello9') +
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
      // @ts-ignore
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

describe('Generics for Bindings and Variables', () => {
  interface CloudflareBindings {
    MY_VARIABLE: string
  }

  it('Should not throw type errors', () => {
    // @ts-expect-error Bindings should extend object
    new Hono<{
      Bindings: number
    }>()

    const appWithInterface = new Hono<{
      Bindings: CloudflareBindings
    }>()

    appWithInterface.get('/', (c) => {
      expectTypeOf(c.env.MY_VARIABLE).toMatchTypeOf<string>()
      return c.text('/')
    })

    const appWithType = new Hono<{
      Bindings: {
        foo: string
      }
    }>()

    appWithType.get('/', (c) => {
      expectTypeOf(c.env.foo).toMatchTypeOf<string>()
      return c.text('Hello Hono!')
    })
  })
})

describe('app.basePath() with the internal #clone()', () => {
  const app = new Hono()
    .notFound((c) => {
      return c.text('Custom not found', 404)
    })
    .onError((c) => {
      return c.text(`Custom error "${c.error!.message}"`, 500)
    })
    .basePath('/api')
    .get('/test', async () => {
      throw new Error('API Test error')
    })

  it('Should return the custom not found', async () => {
    const res = await app.request('/api/not-found')
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('Custom not found')
  })

  it('Should return the custom error', async () => {
    const res = await app.request('/api/test')
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Custom error "API Test error"')
  })
})

describe('Catch-all route with empty segment', () => {
  it('Should return empty string for empty catch-all param', async () => {
    const app = new Hono()
    app.get('/:remaining{.*}', (c) => {
      const remaining = c.req.param('remaining')
      return c.json({ type: typeof remaining, value: remaining })
    })
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ type: 'string', value: '' })
  })
})

describe('Param pattern that matches an empty string', () => {
  const app = new Hono()
  app.get('/api/:id{[0-9]?}', (c) => c.text(`id=${c.req.param('id')}`))

  it('Should match an empty segment', async () => {
    const res = await app.request('/api/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('id=')
  })

  it('Should match a non-empty segment', async () => {
    const res = await app.request('/api/5')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('id=5')
  })

  it('Should not match a segment that does not satisfy the pattern', async () => {
    const res = await app.request('/api/55')
    expect(res.status).toBe(404)
  })
})
