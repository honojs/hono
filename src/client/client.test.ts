/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { expectTypeOf, vi } from 'vitest'
import { upgradeWebSocket } from '../helper'
import { Hono } from '../hono'
import { parse } from '../utils/cookie'
import type { Equal, Expect } from '../utils/types'
import { validator } from '../validator'
import { hc } from './client'
import type { InferRequestType, InferResponseType } from './types'

describe('Basic - JSON', () => {
  const app = new Hono()

  const route = app
    .post(
      '/posts',
      validator('cookie', () => {
        return {} as {
          debug: string
        }
      }),
      validator('header', () => {
        return {} as {
          'x-message': string
        }
      }),
      validator('json', () => {
        return {} as {
          id: number
          title: string
        }
      }),
      (c) => {
        return c.json({
          success: true,
          message: 'dummy',
          requestContentType: 'dummy',
          requestHono: 'dummy',
          requestMessage: 'dummy',
          requestBody: {
            id: 123,
            title: 'dummy',
          },
        })
      }
    )
    .get('/hello-not-found', (c) => c.notFound())
    .get('/null', (c) => c.json(null))

  type AppType = typeof route

  const server = setupServer(
    rest.post('http://localhost/posts', async (req, res, ctx) => {
      const requestContentType = req.headers.get('content-type')
      const requestHono = req.headers.get('x-hono')
      const requestMessage = req.headers.get('x-message')
      const requestBody = await req.json()
      const payload = {
        message: 'Hello!',
        success: true,
        requestContentType,
        requestHono,
        requestMessage,
        requestBody,
      }
      return res(ctx.status(200), ctx.json(payload))
    }),
    rest.get('http://localhost/hello-not-found', (_req, res, ctx) => {
      return res(ctx.status(404))
    }),
    rest.get('http://localhost/null', (_req, res, ctx) => {
      return res(ctx.status(200), ctx.json(null))
    })
  )

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  const payload = {
    id: 123,
    title: 'Hello! Hono!',
  }

  const client = hc<AppType>('http://localhost', { headers: { 'x-hono': 'hono' } })

  it('Should get 200 response', async () => {
    const res = await client.posts.$post(
      {
        json: payload,
        header: {
          'x-message': 'foobar',
        },
        cookie: {
          debug: 'true',
        },
      },
      {}
    )

    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.message).toBe('Hello!')
    expect(data.requestContentType).toBe('application/json')
    expect(data.requestHono).toBe('hono')
    expect(data.requestMessage).toBe('foobar')
    expect(data.requestBody).toEqual(payload)
  })

  it('Should get 404 response', async () => {
    const res = await client['hello-not-found'].$get()
    expect(res.status).toBe(404)
  })

  it('Should get a `null` content', async () => {
    const client = hc<AppType>('http://localhost')
    const res = await client.null.$get()
    const data = await res.json()
    expectTypeOf(data).toMatchTypeOf<null>()
    expect(data).toBe(null)
  })
})

describe('Basic - query, queries, form, path params, header and cookie', () => {
  const app = new Hono()

  const route = app
    .get(
      '/search',
      validator('query', () => {
        return {} as { q: string; tag: string[]; filter: string }
      }),
      (c) => {
        return c.json({
          q: 'fake',
          tag: ['fake'],
          filter: 'fake',
        })
      }
    )
    .put(
      '/posts/:id',
      validator('form', () => {
        return {
          title: 'Hello',
        }
      }),
      (c) => {
        const data = c.req.valid('form')
        return c.json(data)
      }
    )
    .get(
      '/header',
      validator('header', () => {
        return {
          'x-message-id': 'Hello',
        }
      }),
      (c) => {
        const data = c.req.valid('header')
        return c.json(data)
      }
    )
    .get(
      '/cookie',
      validator('cookie', () => {
        return {
          hello: 'world',
        }
      }),
      (c) => {
        const data = c.req.valid('cookie')
        return c.json(data)
      }
    )

  const server = setupServer(
    rest.get('http://localhost/api/search', (req, res, ctx) => {
      const url = new URL(req.url)
      const query = url.searchParams.get('q')
      const tag = url.searchParams.getAll('tag')
      const filter = url.searchParams.get('filter')
      return res(
        ctx.status(200),
        ctx.json({
          q: query,
          tag,
          filter,
        })
      )
    }),
    rest.get('http://localhost/api/posts', (req, res, ctx) => {
      const url = new URL(req.url)
      const tags = url.searchParams.getAll('tags')
      return res(
        ctx.status(200),
        ctx.json({
          tags: tags,
        })
      )
    }),
    rest.put('http://localhost/api/posts/123', async (req, res, ctx) => {
      const buffer = await req.arrayBuffer()
      // @ts-ignore
      const string = String.fromCharCode.apply('', new Uint8Array(buffer))
      return res(ctx.status(200), ctx.text(string))
    }),
    rest.get('http://localhost/api/header', async (req, res, ctx) => {
      const message = await req.headers.get('x-message-id')
      return res(ctx.status(200), ctx.json({ 'x-message-id': message }))
    }),

    rest.get('http://localhost/api/cookie', async (req, res, ctx) => {
      const obj = parse(req.headers.get('cookie') || '')
      const value = obj['hello']
      return res(ctx.status(200), ctx.json({ hello: value }))
    })
  )

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  type AppType = typeof route

  const client = hc<AppType>('http://localhost/api')

  it('Should get 200 response - query', async () => {
    const res = await client.search.$get({
      query: {
        q: 'foobar',
        tag: ['a', 'b'],
        // @ts-expect-error
        filter: undefined,
      },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      q: 'foobar',
      tag: ['a', 'b'],
      filter: null,
    })
  })

  it('Should get 200 response - form, params', async () => {
    const res = await client.posts[':id'].$put({
      form: {
        title: 'Good Night',
      },
      param: {
        id: '123',
      },
    })

    expect(res.status).toBe(200)
    expect(await res.text()).toMatch('Good Night')
  })

  it('Should get 200 response - header', async () => {
    const header = {
      'x-message-id': 'Hello',
    }
    const res = await client.header.$get({
      header,
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(header)
  })

  it('Should get 200 response - cookie', async () => {
    const cookie = {
      hello: 'world',
    }
    const res = await client.cookie.$get({
      cookie,
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(cookie)
  })
})

describe('Infer the response/request type', () => {
  const app = new Hono()
  const route = app.get(
    '/',
    validator('query', () => {
      return {
        name: 'dummy',
        age: 'dummy',
      }
    }),
    validator('header', () => {
      return {
        'x-request-id': 'dummy',
      }
    }),
    validator('cookie', () => {
      return {
        name: 'dummy',
      }
    }),
    (c) =>
      c.json({
        id: 123,
        title: 'Morning!',
      })
  )

  type AppType = typeof route

  it('Should infer response type the type correctly', () => {
    const client = hc<AppType>('/')
    const req = client.index.$get

    type Actual = InferResponseType<typeof req>
    type Expected = {
      id: number
      title: string
    }
    type verify = Expect<Equal<Expected, Actual>>
  })

  it('Should infer request type the type correctly', () => {
    const client = hc<AppType>('/')
    const req = client.index.$get

    type Actual = InferRequestType<typeof req>
    type Expected = {
      age: string | string[]
      name: string | string[]
    }
    type verify = Expect<Equal<Expected, Actual['query']>>
  })

  it('Should infer request header type the type correctly', () => {
    const client = hc<AppType>('/')
    const req = client.index.$get
    type c = typeof req

    type Actual = InferRequestType<c>
    type Expected = {
      'x-request-id': string
    }
    type verify = Expect<Equal<Expected, Actual['header']>>
  })

  it('Should infer request cookie type the type correctly', () => {
    const client = hc<AppType>('/')
    const req = client.index.$get
    type c = typeof req

    type Actual = InferRequestType<c>
    type Expected = {
      name: string
    }
    type verify = Expect<Equal<Expected, Actual['cookie']>>
  })

  describe('Without input', () => {
    const route = app.get('/', (c) => c.json({ ok: true }))
    type AppType = typeof route

    it('Should infer response type the type correctly', () => {
      const client = hc<AppType>('/')
      const req = client.index.$get

      type Actual = InferResponseType<typeof req>
      type Expected = { ok: boolean }
      type verify = Expect<Equal<Expected, Actual>>
    })

    it('Should infer request type the type correctly', () => {
      const client = hc<AppType>('/')
      const req = client.index.$get

      type Actual = InferRequestType<typeof req>
      type Expected = {}
      type verify = Expect<Equal<Expected, Actual>>
    })
  })
})

describe('Merge path with `app.route()`', () => {
  const server = setupServer(
    rest.get('http://localhost/api/search', async (req, res, ctx) => {
      return res(
        ctx.json({
          ok: true,
        })
      )
    }),
    rest.get('http://localhost/api/foo', async (req, res, ctx) => {
      return res(
        ctx.json({
          ok: true,
        })
      )
    }),
    rest.post('http://localhost/api/bar', async (req, res, ctx) => {
      return res(
        ctx.json({
          ok: true,
        })
      )
    }),
    rest.get('http://localhost/v1/book', async (req, res, ctx) => {
      return res(
        ctx.json({
          ok: true,
        })
      )
    })
  )

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  type Env = {
    Bindings: {
      TOKEN: string
    }
  }

  it('Should have correct types', async () => {
    const api = new Hono<Env>().get('/search', (c) => c.json({ ok: true }))
    const app = new Hono<Env>().route('/api', api)
    type AppType = typeof app
    const client = hc<AppType>('http://localhost')
    const res = await client.api.search.$get()
    const data = await res.json()
    type verify = Expect<Equal<boolean, typeof data.ok>>
    expect(data.ok).toBe(true)
  })

  it('Should have correct types - basePath() then get()', async () => {
    const base = new Hono<Env>().basePath('/api')
    const app = base.get('/search', (c) => c.json({ ok: true }))
    type AppType = typeof app
    const client = hc<AppType>('http://localhost')
    const res = await client.api.search.$get()
    const data = await res.json()
    type verify = Expect<Equal<boolean, typeof data.ok>>
    expect(data.ok).toBe(true)
  })

  it('Should have correct types - basePath(), route(), get()', async () => {
    const book = new Hono().get('/', (c) => c.json({ ok: true }))
    const app = new Hono().basePath('/v1').route('/book', book)
    type AppType = typeof app
    const client = hc<AppType>('http://localhost')
    const res = await client.v1.book.$get()
    const data = await res.json()
    type verify = Expect<Equal<boolean, typeof data.ok>>
    expect(data.ok).toBe(true)
  })

  it('Should have correct types - with interface', async () => {
    interface Result {
      ok: boolean
    }
    const result: Result = { ok: true }
    const base = new Hono<Env>().basePath('/api')
    const app = base.get('/search', (c) => c.json(result))
    type AppType = typeof app
    const client = hc<AppType>('http://localhost')
    const res = await client.api.search.$get()
    const data = await res.json()
    type verify = Expect<Equal<Result, typeof data>>
    expect(data.ok).toBe(true)
  })

  it('Should allow a Date object and return it as a string', async () => {
    const app = new Hono()
    const route = app.get('/api/foo', (c) => c.json({ datetime: new Date() }))
    type AppType = typeof route
    const client = hc<AppType>('http://localhost')
    const res = await client.api.foo.$get()
    const { datetime } = await res.json()
    type verify = Expect<Equal<string, typeof datetime>>
  })

  describe('Multiple endpoints', () => {
    const api = new Hono()
      .get('/foo', (c) => c.json({ foo: '' }))
      .post('/bar', (c) => c.json({ bar: 0 }))
    const app = new Hono().route('/api', api)
    type AppType = typeof app
    const client = hc<typeof app>('http://localhost')

    it('Should return correct types - GET /api/foo', async () => {
      const res = await client.api.foo.$get()
      const data = await res.json()
      type verify = Expect<Equal<string, typeof data.foo>>
    })

    it('Should return correct types - POST /api/bar', async () => {
      const res = await client.api.bar.$post()
      const data = await res.json()
      type verify = Expect<Equal<number, typeof data.bar>>
    })
    it('Should work with $url', async () => {
      const url = client.api.bar.$url()
      expect(url.href).toBe('http://localhost/api/bar')
    })
  })

  describe('With a blank path', () => {
    const app = new Hono().basePath('/api/v1')
    const routes = app.route(
      '/me',
      new Hono().route(
        '',
        new Hono().get('', async (c) => {
          return c.json({ name: 'hono' })
        })
      )
    )
    const client = hc<typeof routes>('http://localhost')

    it('Should infer paths correctly', async () => {
      // Should not a throw type error
      const url = client.api.v1.me.$url()
      expectTypeOf<URL>(url)
      expect(url.href).toBe('http://localhost/api/v1/me')
    })
  })
})

describe('Use custom fetch method', () => {
  it('Should call the custom fetch method when provided', async () => {
    const fetchMock = vi.fn()

    const api = new Hono().get('/search', (c) => c.json({ ok: true }))
    const app = new Hono().route('/api', api)
    type AppType = typeof app
    const client = hc<AppType>('http://localhost', { fetch: fetchMock })
    await client.api.search.$get()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('Should return Response from custom fetch method', async () => {
    const fetchMock = vi.fn()
    const returnValue = new Response(null, { status: 200 })
    fetchMock.mockReturnValueOnce(returnValue)

    const api = new Hono().get('/search', (c) => c.json({ ok: true }))
    const app = new Hono().route('/api', api)
    type AppType = typeof app
    const client = hc<AppType>('http://localhost', { fetch: fetchMock })
    const res = await client.api.search.$get()
    expect(res.ok).toBe(true)
    expect(res).toEqual(returnValue)
  })
})

describe('Use custom fetch (app.request) method', () => {
  it('Should return Response from app request method', async () => {
    const app = new Hono().get('/search', (c) => c.json({ ok: true }))
    type AppType = typeof app
    const client = hc<AppType>('', { fetch: app.request })
    const res = await client.search.$get()
    expect(res.ok).toBe(true)
  })
})

describe('Optional parameters in JSON response', () => {
  it('Should return the correct type', async () => {
    const app = new Hono().get('/', (c) => {
      return c.json({ message: 'foo' } as { message?: string })
    })
    type AppType = typeof app
    const client = hc<AppType>('', { fetch: app.request })
    const res = await client.index.$get()
    const data = await res.json()
    expectTypeOf(data).toEqualTypeOf<{
      message?: string
    }>()
  })
})

describe('ClientResponse<T>.json() returns a Union type correctly', () => {
  const condition = () => true
  const app = new Hono().get('/', async (c) => {
    const ok = condition()
    if (ok) {
      return c.json({ data: 'foo' })
    }
    return c.json({ message: 'error' })
  })

  const client = hc<typeof app>('', { fetch: app.request })
  it('Should be a Union type', async () => {
    const res = await client.index.$get()
    const json = await res.json()
    expectTypeOf(json).toEqualTypeOf<{ data: string } | { message: string }>()
  })
})

describe('Response with different status codes', () => {
  const condition = () => true
  const app = new Hono().get('/', async (c) => {
    const ok = condition()
    if (ok) {
      return c.json({ data: 'foo' }, 200)
    }
    if (!ok) {
      return c.json({ message: 'error' }, 400)
    }
    return c.json(null)
  })

  const client = hc<typeof app>('', { fetch: app.request })

  it('all', async () => {
    const res = await client.index.$get()
    const json = await res.json()
    expectTypeOf(json).toEqualTypeOf<{ data: string } | { message: string } | null>()
  })

  it('status 200', async () => {
    const res = await client.index.$get()
    if (res.status === 200) {
      const json = await res.json()
      expectTypeOf(json).toEqualTypeOf<{ data: string } | null>()
    }
  })

  it('status 400', async () => {
    const res = await client.index.$get()
    if (res.status === 400) {
      const json = await res.json()
      expectTypeOf(json).toEqualTypeOf<{ message: string } | null>()
    }
  })

  it('response is ok', async () => {
    const res = await client.index.$get()
    if (res.ok) {
      const json = await res.json()
      expectTypeOf(json).toEqualTypeOf<{ data: string } | null>()
    }
  })

  it('response is not ok', async () => {
    const res = await client.index.$get()
    if (!res.ok) {
      const json = await res.json()
      expectTypeOf(json).toEqualTypeOf<{ message: string } | null>()
    }
  })
})

describe('Infer the response type with different status codes', () => {
  const condition = () => true
  const app = new Hono().get('/', async (c) => {
    const ok = condition()
    if (ok) {
      return c.json({ data: 'foo' }, 200)
    }
    if (!ok) {
      return c.json({ message: 'error' }, 400)
    }
    return c.json(null)
  })

  const client = hc<typeof app>('', { fetch: app.request })

  it('Should infer response type correctly', () => {
    const req = client.index.$get

    type Actual = InferResponseType<typeof req>
    type Expected =
      | {
          data: string
        }
      | {
          message: string
        }
      | null
    type verify = Expect<Equal<Expected, Actual>>
  })

  it('Should infer response type of status 200 correctly', () => {
    const req = client.index.$get

    type Actual = InferResponseType<typeof req, 200>
    type Expected = {
      data: string
    } | null
    type verify = Expect<Equal<Expected, Actual>>
  })
})

describe('$url() with a param option', () => {
  const app = new Hono().get('/posts/:id/comments', (c) => c.json({ ok: true }))
  type AppType = typeof app
  const client = hc<AppType>('http://localhost')

  it('Should return the correct path - /posts/123/comments', async () => {
    const url = client.posts[':id'].comments.$url({
      param: {
        id: '123',
      },
    })
    expect(url.pathname).toBe('/posts/123/comments')
  })

  it('Should return the correct path - /posts/:id/comments', async () => {
    const url = client.posts[':id'].comments.$url()
    expect(url.pathname).toBe('/posts/:id/comments')
  })
})

describe('Client can be awaited', () => {
  it('Can be awaited without side effects', async () => {
    const client = hc('http://localhost')

    const awaited = await client

    expect(awaited).toEqual(client)
  })
})

describe('Dynamic headers', () => {
  const app = new Hono()

  const route = app.post('/posts', (c) => {
    return c.json({
      requestDynamic: 'dummy',
    })
  })

  type AppType = typeof route

  const server = setupServer(
    rest.post('http://localhost/posts', async (req, res, ctx) => {
      const requestDynamic = req.headers.get('x-dynamic')
      const payload = {
        requestDynamic,
      }
      return res(ctx.status(200), ctx.json(payload))
    })
  )

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  let dynamic = ''

  const client = hc<AppType>('http://localhost', {
    headers: () => ({ 'x-hono': 'hono', 'x-dynamic': dynamic }),
  })

  it('Should have "x-dynamic": "one"', async () => {
    dynamic = 'one'

    const res = await client.posts.$post()

    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.requestDynamic).toEqual('one')
  })

  it('Should have "x-dynamic": "two"', async () => {
    dynamic = 'two'

    const res = await client.posts.$post()

    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.requestDynamic).toEqual('two')
  })
})

describe('WebSocket URL Protocol Translation', () => {
  const app = new Hono()
  const route = app.get(
    '/',
    upgradeWebSocket((c) => ({
      onMessage(event, ws) {
        console.log(`Message from client: ${event.data}`)
        ws.send('Hello from server!')
      },
      onClose: () => {
        console.log('Connection closed')
      },
    }))
  )

  type AppType = typeof route

  const server = setupServer()
  const webSocketMock = vi.fn()

  beforeAll(() => server.listen())
  beforeEach(() => {
    vi.stubGlobal('WebSocket', webSocketMock)
  })
  afterEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })
  afterAll(() => server.close())

  it('Translates HTTP to ws', async () => {
    const client = hc<AppType>('http://localhost')
    client.index.$ws()
    expect(webSocketMock).toHaveBeenCalledWith('ws://localhost/index')
  })

  it('Translates HTTPS to wss', async () => {
    const client = hc<AppType>('https://localhost')
    client.index.$ws()
    expect(webSocketMock).toHaveBeenCalledWith('wss://localhost/index')
  })

  it('Keeps ws unchanged', async () => {
    const client = hc<AppType>('ws://localhost')
    client.index.$ws()
    expect(webSocketMock).toHaveBeenCalledWith('ws://localhost/index')
  })

  it('Keeps wss unchanged', async () => {
    const client = hc<AppType>('wss://localhost')
    client.index.$ws()
    expect(webSocketMock).toHaveBeenCalledWith('wss://localhost/index')
  })
})

describe('Client can be console.log in react native', () => {
  it('Returns a function name with function.name.toString', async () => {
    const client = hc('http://localhost')
    // @ts-ignore
    expect(client.posts.name.toString()).toEqual('posts')
  })

  it('Returns a function name with function.name.valueOf', async () => {
    const client = hc('http://localhost')
    // @ts-ignore
    expect(client.posts.name.valueOf()).toEqual('posts')
  })

  it('Returns a function with function.valueOf', async () => {
    const client = hc('http://localhost')
    expect(typeof client.posts.valueOf()).toEqual('function')
  })

  it('Returns a function source with function.toString', async () => {
    const client = hc('http://localhost')
    expect(client.posts.toString()).toMatch('function proxyCallback')
  })
})
