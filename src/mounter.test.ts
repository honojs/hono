import { Hono } from './hono'
import { getBaseURLAndPath, normalizePath, getNewRequestURL, mount } from './mounter'
import { getPath } from './utils/url'

describe('getBaseURLAndPath', () => {
  const baseURL = 'http://localhost'
  it('Should return the base URL', () => {
    expect(getBaseURLAndPath('http://localhost/abc')).toEqual([baseURL, '/abc'])
    expect(getBaseURLAndPath('http://localhost/abc/def')).toEqual([baseURL, '/abc/def'])
    expect(getBaseURLAndPath('http://localhost/')).toEqual([baseURL, '/'])
    expect(getBaseURLAndPath('http://localhost')).toEqual([baseURL, '/'])
    expect(getBaseURLAndPath('hhttp')).toEqual(['hhttp', '/'])
  })
})

describe('normalizePath', () => {
  it('Should normalize a path', () => {
    expect(normalizePath('/abc')).toBe('/abc')
    expect(normalizePath('/abc/')).toBe('/abc/')
    expect(normalizePath('/abc/*')).toBe('/abc')
    expect(normalizePath('/abc*')).toBe('/abc*')
    expect(normalizePath('/*')).toBe('/')
    expect(normalizePath('/')).toBe('/')
  })
})

describe('getNewRequestURL', () => {
  it('Should return a correct URL', () => {
    expect(getNewRequestURL('http://localhost/abc', '/abc')).toBe('http://localhost/')
    expect(getNewRequestURL('http://localhost/abc/def', '/abc')).toBe('http://localhost/def')
    expect(getNewRequestURL('http://localhost/abc/def/ghi', '/abc')).toBe(
      'http://localhost/def/ghi'
    )
    expect(getNewRequestURL('http://localhost/abc', '/')).toBe('http://localhost/abc')
    expect(getNewRequestURL('http://localhost/abc', 'abc')).toBe('http://localhost/abc')
    expect(getNewRequestURL('http://localhost/abc/def', '/def')).toBe('http://localhost/abc/def')
    expect(getNewRequestURL('http://localhost/abc', '/*')).toBe('http://localhost/abc')
    expect(getNewRequestURL('http://localhost/abc/def', '/abc/*')).toBe('http://localhost/def')
    expect(getNewRequestURL('http://localhost/abc/def', '/abc*')).toBe('http://localhost/def')
  })
})

describe('mount', () => {
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
    app.get(
      ...mount('/another-app', anotherApp, () => {
        return 'params'
      })
    )

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

      res = await app.request('/another-app/with-params')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        params: 'params',
      })
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
    app.get(...mount('/another-app', anotherApp))

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
})
