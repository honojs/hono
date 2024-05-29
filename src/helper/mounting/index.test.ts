import type { ExecutionContext } from '../../context'
import { Hono } from '../../hono'
import { getPath } from '../../utils/url'
import { toHandler } from './index'

const createAnotherApp = (basePath: string = '') => {
  return (req: Request, params: unknown) => {
    const path = getPath(req)
    if (path === `${basePath === '' ? '/' : basePath}`) {
      return new Response('AnotherApp')
    }
    if (path === `${basePath}/hello`) {
      return new Response('Hello from AnotherApp')
    }
    if (path === `${basePath}/header`) {
      const message = req.headers.get('x-message')
      return new Response(message)
    }
    if (path === `${basePath}/with-query`) {
      const queryStrings = new URL(req.url).searchParams.toString()
      return new Response(queryStrings)
    }
    if (path == `${basePath}/with-params`) {
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
    if (path === `${basePath}/path`) {
      return new Response(getPath(req))
    }
    return new Response('Not Found from AnotherApp', {
      status: 404,
    })
  }
}

const testAnotherApp = (app: Hono) => {
  it('Should return 200 from AnotherApp - /app', async () => {
    const res = await app.request('/app')
    expect(res.status).toBe(200)
    expect(res.headers.get('x-message')).toBe('Foo')
    expect(await res.text()).toBe('AnotherApp')
  })

  it('Should return 200 from AnotherApp - /app/hello', async () => {
    const res = await app.request('/app/hello')
    expect(res.status).toBe(200)
    expect(res.headers.get('x-message')).toBe('Foo')
    expect(await res.text()).toBe('Hello from AnotherApp')
  })

  it('Should return 200 from AnotherApp - /app/header', async () => {
    const res = await app.request('/app/header', {
      headers: {
        'x-message': 'Message Foo!',
      },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('x-message')).toBe('Foo')
    expect(await res.text()).toBe('Message Foo!')
  })

  it('Should return 404 from AnotherApp - /app/not-found', async () => {
    const res = await app.request('/app/not-found')
    expect(res.status).toBe(404)
    expect(res.headers.get('x-message')).toBe('Foo')
    expect(await res.text()).toBe('Not Found from AnotherApp')
  })

  it('Should return 200 from AnotherApp - /app/with-query?foo=bar&baz-qux', async () => {
    const res = await app.request('/app/with-query?foo=bar&baz=qux')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('foo=bar&baz=qux')
  })

  it('Should return 200 from AnotherApp - /app/with-params', async () => {
    const res = await app.request('/app/with-params')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      params: 'params',
    })
  })
}

describe('Basic', () => {
  const anotherApp = createAnotherApp('/app')
  const app = new Hono()
  app.use('*', async (c, next) => {
    await next()
    c.header('x-message', 'Foo')
  })
  app.get('/', (c) => c.text('Hono'))
  app.all(
    '/app/*',
    toHandler(anotherApp, {
      optionHandler: () => 'params',
    })
  )

  it('Should return 200 from Hono app', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(res.headers.get('x-message')).toBe('Foo')
    expect(await res.text()).toBe('Hono')
  })

  testAnotherApp(app)

  it('Should return 200 from AnotherApp - /app/path', async () => {
    const res = await app.request('/app/path')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/app/path')
  })
})

describe('With basePath', () => {
  const anotherApp = createAnotherApp()
  const app = new Hono()
  app.use('*', async (c, next) => {
    await next()
    c.header('x-message', 'Foo')
  })
  app.all(
    '/app/*',
    toHandler(anotherApp, {
      optionHandler: () => 'params',
      basePath: '/app',
    })
  )

  testAnotherApp(app)

  it('Should return 200 from AnotherApp - /app/path', async () => {
    const res = await app.request('/app/path')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/path')
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
  app.all(
    '/another-app/*',
    toHandler(anotherApp, {
      basePath: '/another-app',
    })
  )

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
