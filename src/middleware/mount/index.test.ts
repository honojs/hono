import { mount } from '.'
/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { ExecutionContext } from '../../context'
import { Hono } from '../../hono'
import { getPath } from '../../utils/url'

describe('mount()', () => {
  describe('Basic', () => {
    const anotherApp = (req: Request, ...params: unknown[]) => {
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
      if (path === '/undefined') {
        return undefined as unknown as Response
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
    app.notFound((c) => {
      return c.text('Not Found from App', 404)
    })

    app.all(
      '/another-app/*',
      mount(anotherApp, () => {
        return 'params'
      })
    )
    app.all(
      '/another-app-with-array-option/*',
      mount(anotherApp, () => {
        return ['param1', 'param2']
      })
    )
    app.all('/another-app2/sub-slash/*', mount(anotherApp))

    const api = new Hono().basePath('/api')
    api.all('/another-app/*', mount(anotherApp))

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
        params: ['params'],
      })

      res = await app.request('/another-app/undefined')
      expect(res.status).toBe(404)
      expect(await res.text()).toBe('Not Found from App')
    })

    it('Should return response from Another app with an array option', async () => {
      const res = await app.request('/another-app-with-array-option/with-params')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        params: ['param1', 'param2'],
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

  describe('With dynamic prefixes', () => {
    const anotherApp = (req: Request) => new Response(getPath(req))

    it.each([
      ['/api/:version/*', '/api/v1/hello', '/hello'],
      ['/api/:version/*', '/api/long-version/hello', '/hello'],
      ['/api/:version/*', '/api/v1', '/'],
      ['/api/:version/*', '/api/v1/', '/'],
      ['/api/:version/*', '/api/v1//hello', '//hello'],
      ['/user/:id{[^/]+}/*', '/user/123/hello', '/hello'],
      ['/api/:id{[0-9]{2}}/*', '/api/12/hello', '/hello'],
      ['/api/:first{[a-z]+}/:second{[0-9]+}/*', '/api/a/1234/hello', '/hello'],
      ['/x/:prefix{.+}/x/*', '/x/a/b/x/c/d', '/c/d'],
      ['/x/:prefix{.+}/x/*', '/x/a%2Fb/c/x/d%2Fe', '/d%2Fe'],
      ['/api/:id{[^/]+}/*', '/api/ad%2Fmin/x%252Fy', '/x%252Fy'],
      ['/api/:id{[^/]+}/*', '/api/foo%252Fbar/hello', '/hello'],
      ['/api/:id{[^/]+}/*', '/api/%C3%A9/admin%2Fsecret', '/admin%2Fsecret'],
    ])('Should strip %s from %s', async (route, path, expected) => {
      const app = new Hono()
      app.all(route, mount(anotherApp))

      const res = await app.request(path)

      expect(res.status).toBe(200)
      expect(await res.text()).toBe(expected)
    })

    it('Should use the current route captures with a merged basePath', async () => {
      const app = new Hono()
      app.use('*', async (_c, next) => {
        await next()
      })
      const subApp = new Hono().basePath('/:tenant')
      subApp.all('/app/:id{[^/]+}/*', mount(anotherApp))
      app.route('/api', subApp)

      const res = await app.request('/api/acme/app/ad%2Fmin/hello')

      expect(res.status).toBe(200)
      expect(await res.text()).toBe('/hello')
    })

    it.each([
      ['/a/*/b/*', '/a/one/b/two/three', '/two/three'],
      ['/a/*/b/*', '/a/one/b', '/'],
      ['/foo/*/*', '/foo/x/y/z', '/y/z'],
      ['/x*/y/*', '/xabc/y/hello', '/hello'],
      ['/x*/y/*', '/x/y/hello', '/hello'],
      ['/x*/*', '/x/y', '/y'],
      ['/x*/*', '/x/hello%2Fworld', '/hello%2Fworld'],
      ['/x*/y/*', '/x%25/y/foo%252Fbar', '/foo%252Fbar'],
      ['/assets*', '/assets/hello', '/hello'],
      ['/assets*', '/assets-v2/hello', '/-v2/hello'],
      ['/x*/y*', '/xyz/yellow/hello', '/ellow/hello'],
    ])('Should strip %s up to the final wildcard from %s', async (route, path, expected) => {
      const app = new Hono()
      app.all(route, mount(anotherApp))

      const res = await app.request(path)

      expect(res.status).toBe(200)
      expect(await res.text()).toBe(expected)
    })

    it.each([
      ['/x*/:id/*', '/xabc/123/hello', '/hello'],
      ['/x*/:id/*', '/x/123/hello', '/hello'],
      ['/a/*/b/:prefix{.+}/c/*', '/a/one/b/two/three/c/four/five', '/four/five'],
    ])('Should resolve wildcards and parameters in %s for %s', async (route, path, expected) => {
      const app = new Hono()
      app.all(route, mount(anotherApp))

      const res = await app.request(path)

      expect(res.status).toBe(200)
      expect(await res.text()).toBe(expected)
    })
  })

  describe('With duplicate parameter names', () => {
    it.each([
      '/api/:id/:id/*',
      '/api/:id{[a-z]+}/:id{[0-9]+}/*',
      '/api/:id/:id{[0-9]+}/*',
      '/api/:id{[a-z]+}/:id/*',
    ])('Should reject automatic request rewriting for %s', async (route) => {
      const anotherApp = vi.fn(() => new Response('AnotherApp'))
      const app = new Hono()
      app.onError((c) => c.text(c.error!.message, 500))
      app.all(route, mount(anotherApp))

      const res = await app.request('/api/a/1234/hello')

      expect(res.status).toBe(500)
      expect(await res.text()).toBe(`mount(): Duplicate path parameter "id" in "${route}".`)
      expect(anotherApp).not.toHaveBeenCalled()
    })

    it('Should detect duplicate names introduced by merging route prefixes', async () => {
      const anotherApp = vi.fn(() => new Response('AnotherApp'))
      const subApp = new Hono()
      subApp.all('/:id{[0-9]+}/*', mount(anotherApp))
      const app = new Hono()
      app.onError((c) => c.text(c.error!.message, 500))
      app.route('/api/:id{[a-z]+}', subApp)

      const res = await app.request('/api/a/1234')

      expect(res.status).toBe(500)
      expect(await res.text()).toBe(
        'mount(): Duplicate path parameter "id" in "/api/:id{[a-z]+}/:id{[0-9]+}/*".'
      )
      expect(anotherApp).not.toHaveBeenCalled()
    })

    it.each([
      { name: 'custom replaceRequest', replaceRequest: (req: Request) => req },
      { name: 'replaceRequest: false', replaceRequest: false as const },
    ])('Should allow duplicate names with $name', async ({ replaceRequest }) => {
      const app = new Hono()
      app.all(
        '/api/:id{[a-z]+}/:id{[0-9]+}/*',
        mount((req) => new Response(getPath(req)), { replaceRequest })
      )

      const res = await app.request('/api/a/1234/hello')

      expect(res.status).toBe(200)
      expect(await res.text()).toBe('/api/a/1234/hello')
    })
  })

  describe('With encoded paths', () => {
    const anotherApp = (req: Request) => new Response(getPath(req))

    it('Should strip a decoded non-ASCII mount prefix', async () => {
      const app = new Hono()
      app.all('/api/é/*', mount(anotherApp))

      const res = await app.request('/api/%C3%A9/hello')

      expect(res.status).toBe(200)
      expect(await res.text()).toBe('/hello')
    })

    it('Should preserve an encoded slash as a literal path segment after stripping the prefix', async () => {
      const app = new Hono()
      app.all('/api/v1/*', mount(anotherApp))

      const res = await app.request('/api/v1/admin%2Fsecret')

      expect(res.status).toBe(200)
      expect(await res.text()).toBe('/admin%2Fsecret')
    })

    it('Should preserve encoded percent characters after stripping the prefix', async () => {
      const app = new Hono()
      app.all('/api/*', mount(anotherApp))

      const res = await app.request('/api/foo%252Fbar')

      expect(res.status).toBe(200)
      expect(await res.text()).toBe('/foo%252Fbar')
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
    app.all('/another-app/*', mount(anotherApp))

    it('Should handle Env and ExecuteContext', async () => {
      const request = new Request('http://localhost/another-app')
      const res = await app.fetch(
        request,
        {
          TOKEN: 'foo',
        },
        {
          // Force mocking!

          // @ts-ignore
          waitUntil: 'waitUntil',

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

  describe.each(['*', '/*'])('Mount on `%s`', (route) => {
    const anotherApp = (req: Request, _params: unknown) => {
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
    app.all(route, mount(anotherApp))

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

  describe('With replaceRequest option', () => {
    const anotherApp = (req: Request) => {
      const path = getPath(req)
      if (path === '/app') {
        return new Response(getPath(req))
      }
      return new Response(null, { status: 404 })
    }

    const app = new Hono()
    app.all(
      '/app/*',
      mount(anotherApp, {
        replaceRequest: (req) => req,
      })
    )

    it('Should return 200 response with the correct path', async () => {
      const res = await app.request('/app')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('/app')
    })
  })

  describe('With replaceRequest: false', () => {
    const anotherApp = (req: Request) => {
      const path = getPath(req)
      if (path === '/app') {
        return new Response(getPath(req))
      }
      return new Response(null, { status: 404 })
    }

    const app = new Hono()
    app.all('/app/*', mount(anotherApp, { replaceRequest: false }))

    it('Should return 200 response with the correct path', async () => {
      const res = await app.request('/app')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('/app')
    })
  })

  describe('Used as `app.use()` middleware', () => {
    const anotherApp = (req: Request) => {
      const path = getPath(req)
      if (path === '/hello') {
        return new Response('Hello from AnotherApp')
      }
      // Fall through to the Hono app
      return undefined as unknown as Response
    }

    const app = new Hono()
    app.use('/another-app/*', mount(anotherApp))
    app.get('/another-app/fallback', (c) => c.text('Fallback from App'))

    it('Should return responses from AnotherApp', async () => {
      const res = await app.request('/another-app/hello')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Hello from AnotherApp')
    })

    it('Should fall through to the Hono app if AnotherApp returns nothing', async () => {
      const res = await app.request('/another-app/fallback')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Fallback from App')
    })
  })
})
