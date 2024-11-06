/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/ban-ts-comment */
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { expectTypeOf, vi } from 'vitest'
import { upgradeWebSocket } from '../adapter/deno/websocket'
import { Hono } from '../hono'
import { parse } from '../utils/cookie'
import type { Equal, Expect, JSONValue, SimplifyDeepArray } from '../utils/types'
import { validator } from '../validator'
import { hc } from './client'
import type { ClientResponse, InferRequestType, InferResponseType } from './types'

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
    http.post('http://localhost/posts', async ({ request }) => {
      const requestContentType = request.headers.get('content-type')
      const requestHono = request.headers.get('x-hono')
      const requestMessage = request.headers.get('x-message')
      const requestBody = await request.json()
      const payload = {
        message: 'Hello!',
        success: true,
        requestContentType,
        requestHono,
        requestMessage,
        requestBody,
      }
      return HttpResponse.json(payload)
    }),
    http.get('http://localhost/hello-not-found', () => {
      return HttpResponse.text(null, {
        status: 404,
      })
    }),
    http.get('http://localhost/null', () => {
      return HttpResponse.json(null)
    }),
    http.get('http://localhost/api/string', () => {
      return HttpResponse.json('a-string')
    }),
    http.get('http://localhost/api/number', async () => {
      return HttpResponse.json(37)
    }),
    http.get('http://localhost/api/boolean', async () => {
      return HttpResponse.json(true)
    }),
    http.get('http://localhost/api/generic', async () => {
      return HttpResponse.json(Math.random() > 0.5 ? Boolean(Math.random()) : Math.random())
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

  it('Should have correct types - primitives', async () => {
    const app = new Hono()
    const route = app
      .get('/api/string', (c) => c.json('a-string'))
      .get('/api/number', (c) => c.json(37))
      .get('/api/boolean', (c) => c.json(true))
      .get('/api/generic', (c) =>
        c.json(Math.random() > 0.5 ? Boolean(Math.random()) : Math.random())
      )
    type AppType = typeof route
    const client = hc<AppType>('http://localhost')
    const stringFetch = await client.api.string.$get()
    const stringRes = await stringFetch.json()
    const numberFetch = await client.api.number.$get()
    const numberRes = await numberFetch.json()
    const booleanFetch = await client.api.boolean.$get()
    const booleanRes = await booleanFetch.json()
    const genericFetch = await client.api.generic.$get()
    const genericRes = await genericFetch.json()
    type stringVerify = Expect<Equal<'a-string', typeof stringRes>>
    expect(stringRes).toBe('a-string')
    type numberVerify = Expect<Equal<37, typeof numberRes>>
    expect(numberRes).toBe(37)
    type booleanVerify = Expect<Equal<true, typeof booleanRes>>
    expect(booleanRes).toBe(true)
    type genericVerify = Expect<Equal<number | boolean, typeof genericRes>>
    expect(typeof genericRes === 'number' || typeof genericRes === 'boolean').toBe(true)

    // using .text() on json endpoint should return string
    type textTest = Expect<Equal<Promise<string>, ReturnType<typeof genericFetch.text>>>
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
    http.get('http://localhost/api/search', ({ request }) => {
      const url = new URL(request.url)
      const query = url.searchParams.get('q')
      const tag = url.searchParams.getAll('tag')
      const filter = url.searchParams.get('filter')
      return HttpResponse.json({
        q: query,
        tag,
        filter,
      })
    }),
    http.get('http://localhost/api/posts', ({ request }) => {
      const url = new URL(request.url)
      const tags = url.searchParams.getAll('tags')
      return HttpResponse.json({
        tags: tags,
      })
    }),
    http.put('http://localhost/api/posts/123', async ({ request }) => {
      const buffer = await request.arrayBuffer()
      // @ts-ignore
      const string = String.fromCharCode.apply('', new Uint8Array(buffer))
      return HttpResponse.text(string)
    }),
    http.get('http://localhost/api/header', async ({ request }) => {
      const message = await request.headers.get('x-message-id')
      return HttpResponse.json({ 'x-message-id': message })
    }),
    http.get('http://localhost/api/cookie', async ({ request }) => {
      const obj = parse(request.headers.get('cookie') || '')
      const value = obj['hello']
      return HttpResponse.json({ hello: value })
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

describe('Form - Multiple Values', () => {
  const server = setupServer(
    http.post('http://localhost/multiple-values', async ({ request }) => {
      const data = await request.formData()
      return HttpResponse.json(data.getAll('key'))
    })
  )

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  const client = hc('http://localhost/')

  it('Should get 200 response - query', async () => {
    // @ts-expect-error `client['multiple-values'].$post` is not typed
    const res = await client['multiple-values'].$post({
      form: {
        key: ['foo', 'bar'],
      },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(['foo', 'bar'])
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
    http.get('http://localhost/api/search', async () => {
      return HttpResponse.json({
        ok: true,
      })
    }),
    http.get('http://localhost/api/searchArray', async () => {
      return HttpResponse.json([
        {
          ok: true,
        },
      ])
    }),
    http.get('http://localhost/api/foo', async () => {
      return HttpResponse.json({
        ok: true,
      })
    }),
    http.post('http://localhost/api/bar', async () => {
      return HttpResponse.json({
        ok: true,
      })
    }),
    http.get('http://localhost/v1/book', async () => {
      return HttpResponse.json({
        ok: true,
      })
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
      okUndefined?: boolean
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

    // A few more types only tests
    interface DeepInterface {
      l2: {
        l3: Result
      }
    }
    interface ExtraDeepInterface {
      l4: DeepInterface
    }
    type verifyDeepInterface = Expect<
      Equal<SimplifyDeepArray<DeepInterface> extends JSONValue ? true : false, true>
    >
    type verifyExtraDeepInterface = Expect<
      Equal<SimplifyDeepArray<ExtraDeepInterface> extends JSONValue ? true : false, true>
    >
  })

  it('Should have correct types - with array of interfaces', async () => {
    interface Result {
      ok: boolean
      okUndefined?: boolean
    }
    type Results = Result[]

    const results: Results = [{ ok: true }]
    const base = new Hono<Env>().basePath('/api')
    const app = base.get('/searchArray', (c) => c.json(results))
    type AppType = typeof app
    const client = hc<AppType>('http://localhost')
    const res = await client.api.searchArray.$get()
    const data = await res.json()
    type verify = Expect<Equal<Results, typeof data>>
    expect(data[0].ok).toBe(true)

    // A few more types only tests
    type verifyNestedArrayTyped = Expect<
      Equal<SimplifyDeepArray<[string, Results]> extends JSONValue ? true : false, true>
    >
    type verifyNestedArrayInterfaceArray = Expect<
      Equal<SimplifyDeepArray<[string, Result[]]> extends JSONValue ? true : false, true>
    >
    type verifyExtraNestedArrayTyped = Expect<
      Equal<SimplifyDeepArray<[string, Results[]]> extends JSONValue ? true : false, true>
    >
    type verifyExtraNestedArrayInterfaceArray = Expect<
      Equal<SimplifyDeepArray<[string, Result[][]]> extends JSONValue ? true : false, true>
    >
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
  const app = new Hono()
    .get('/posts/:id/comments', (c) => c.json({ ok: true }))
    .get('/something/:firstId/:secondId/:version?', (c) => c.json({ ok: true }))
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

  it('Should return the correct path - /something/123/456', async () => {
    const url = client.something[':firstId'][':secondId'][':version?'].$url({
      param: {
        firstId: '123',
        secondId: '456',
        version: undefined,
      },
    })
    expect(url.pathname).toBe('/something/123/456')
  })
})

describe('$url() with a query option', () => {
  const app = new Hono().get(
    '/posts',
    validator('query', () => {
      return {} as { filter: 'test' }
    }),
    (c) => c.json({ ok: true })
  )
  type AppType = typeof app
  const client = hc<AppType>('http://localhost')

  it('Should return the correct path - /posts?filter=test', async () => {
    const url = client.posts.$url({
      query: {
        filter: 'test',
      },
    })
    expect(url.search).toBe('?filter=test')
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
    http.post('http://localhost/posts', async ({ request }) => {
      const requestDynamic = request.headers.get('x-dynamic')
      const payload = {
        requestDynamic,
      }
      return HttpResponse.json(payload)
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

describe('RequestInit work as expected', () => {
  const app = new Hono()

  const route = app
    .get('/credentials', (c) => {
      return c.text('' as RequestCredentials)
    })
    .get('/headers', (c) => {
      return c.json({} as Record<string, string>)
    })
    .post('/headers', (c) => c.text('Not found', 404))

  type AppType = typeof route

  const server = setupServer(
    http.get('http://localhost/credentials', ({ request }) => {
      return HttpResponse.text(request.credentials)
    }),
    http.get('http://localhost/headers', ({ request }) => {
      const allHeaders: Record<string, string> = {}
      for (const [k, v] of request.headers.entries()) {
        allHeaders[k] = v
      }

      return HttpResponse.json(allHeaders)
    }),
    http.post('http://localhost/headers', () => {
      return HttpResponse.text('Should not be here', {
        status: 400,
      })
    })
  )

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  const client = hc<AppType>('http://localhost', {
    headers: { 'x-hono': 'fire' },
    init: {
      credentials: 'include',
    },
  })

  it('Should overwrite method and fail', async () => {
    const res = await client.headers.$get(undefined, { init: { method: 'POST' } })

    expect(res.ok).toBe(false)
  })

  it('Should clear headers', async () => {
    const res = await client.headers.$get(undefined, { init: { headers: undefined } })

    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data).toEqual({})
  })

  it('Should overwrite headers', async () => {
    const res = await client.headers.$get(undefined, {
      init: { headers: new Headers({ 'x-hono': 'awesome' }) },
    })

    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data).toEqual({ 'x-hono': 'awesome' })
  })

  it('credentials is include', async () => {
    const res = await client.credentials.$get()

    expect(res.ok).toBe(true)
    const data = await res.text()
    expect(data).toEqual('include')
  })

  it('deepMerge should works and not unset credentials', async () => {
    const res = await client.credentials.$get(undefined, { init: { headers: { hi: 'hello' } } })

    expect(res.ok).toBe(true)
    const data = await res.text()
    expect(data).toEqual('include')
  })

  it('Should unset credentials', async () => {
    const res = await client.credentials.$get(undefined, { init: { credentials: undefined } })

    expect(res.ok).toBe(true)
    const data = await res.text()
    expect(data).toEqual('same-origin')
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

describe('WebSocket URL Protocol Translation with Query Parameters', () => {
  const app = new Hono()
  const route = app.get(
    '/',
    upgradeWebSocket((c) => ({
      onMessage(event, ws) {
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

  it('Translates HTTP to ws and includes query parameters', async () => {
    const client = hc<AppType>('http://localhost')
    client.index.$ws({
      query: {
        id: '123',
        type: 'test',
        tag: ['a', 'b'],
      },
    })
    expect(webSocketMock).toHaveBeenCalledWith('ws://localhost/index?id=123&type=test&tag=a&tag=b')
  })

  it('Translates HTTPS to wss and includes query parameters', async () => {
    const client = hc<AppType>('https://localhost')
    client.index.$ws({
      query: {
        id: '456',
        type: 'secure',
      },
    })
    expect(webSocketMock).toHaveBeenCalledWith('wss://localhost/index?id=456&type=secure')
  })

  it('Keeps ws unchanged and includes query parameters', async () => {
    const client = hc<AppType>('ws://localhost')
    client.index.$ws({
      query: {
        id: '789',
        type: 'plain',
      },
    })
    expect(webSocketMock).toHaveBeenCalledWith('ws://localhost/index?id=789&type=plain')
  })

  it('Keeps wss unchanged and includes query parameters', async () => {
    const client = hc<AppType>('wss://localhost')
    client.index.$ws({
      query: {
        id: '1011',
        type: 'secure',
      },
    })
    expect(webSocketMock).toHaveBeenCalledWith('wss://localhost/index?id=1011&type=secure')
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

describe('Text response', () => {
  const text = 'My name is Hono'
  const obj = { ok: true }
  const server = setupServer(
    http.get('http://localhost/about/me', async () => {
      return HttpResponse.text(text)
    }),
    http.get('http://localhost/api', async ({ request }) => {
      return HttpResponse.json(obj)
    })
  )

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  const app = new Hono().get('/about/me', (c) => c.text(text)).get('/api', (c) => c.json(obj))
  const client = hc<typeof app>('http://localhost/')

  it('Should be never with res.json() - /about/me', async () => {
    const res = await client.about.me.$get()
    type Actual = ReturnType<typeof res.json>
    type Expected = Promise<never>
    type verify = Expect<Equal<Expected, Actual>>
  })

  it('Should be "Hello, World!" with res.text() - /about/me', async () => {
    const res = await client.about.me.$get()
    const data = await res.text()
    expectTypeOf(data).toEqualTypeOf<'My name is Hono'>()
    expect(data).toBe(text)
  })

  /**
   * Also check the type of JSON response with res.text().
   */
  it('Should be string with res.text() - /api', async () => {
    const res = await client.api.$get()
    type Actual = ReturnType<typeof res.text>
    type Expected = Promise<string>
    type verify = Expect<Equal<Expected, Actual>>
  })
})

describe('Redirect response - only types', () => {
  const server = setupServer(
    http.get('http://localhost/', async () => {
      return HttpResponse.redirect('/')
    })
  )

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  const condition = () => true
  const app = new Hono().get('/', async (c) => {
    const ok = condition()
    const temporary = condition()
    if (ok) {
      return c.json({ ok: true }, 200)
    }
    if (temporary) {
      return c.redirect('/302')
    }
    return c.redirect('/301', 301)
  })

  const client = hc<typeof app>('http://localhost/')
  const req = client.index.$get

  it('Should infer request type the type correctly', () => {
    type Actual = InferResponseType<typeof req>
    type Expected =
      | {
          ok: boolean
        }
      | undefined
    type verify = Expect<Equal<Expected, Actual>>
  })

  it('Should infer response type correctly', async () => {
    const res = await req()
    if (res.ok) {
      const data = await res.json()
      expectTypeOf(data).toMatchTypeOf({ ok: true })
    }
    if (res.status === 301) {
      type Expected = ClientResponse<undefined, 301, 'redirect'>
      type verify = Expect<Equal<Expected, typeof res>>
    }
    if (res.status === 302) {
      type Expected = ClientResponse<undefined, 302, 'redirect'>
      type verify = Expect<Equal<Expected, typeof res>>
    }
  })
})

describe('WebSocket Provider Integration', () => {
  const app = new Hono()
  const route = app.get(
    '/',
    upgradeWebSocket((c) => ({
      onMessage(event, ws) {
        ws.send('Hello from server!')
      },
      onClose() {
        console.log('Connection closed')
      },
    }))
  )

  type AppType = typeof route

  const server = setupServer()
  beforeAll(() => server.listen())
  afterEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })
  afterAll(() => server.close())

  it.each([
    {
      description: 'should initialize the WebSocket provider correctly',
      url: 'http://localhost',
      query: undefined,
      expectedUrl: 'ws://localhost/index',
    },
    {
      description: 'should correctly add query parameters to the WebSocket URL',
      url: 'http://localhost',
      query: { id: '123', type: 'test', tag: ['a', 'b'] },
      expectedUrl: 'ws://localhost/index?id=123&type=test&tag=a&tag=b',
    },
  ])('$description', ({ url, expectedUrl, query }) => {
    const webSocketMock = vi.fn()
    const client = hc<AppType>(url, {
      webSocket(url, options) {
        return webSocketMock(url, options)
      },
    })
    client.index.$ws({ query })
    expect(webSocketMock).toHaveBeenCalledWith(expectedUrl, undefined)
  })
})
