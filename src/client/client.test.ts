/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import FormData from 'form-data'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import _fetch, { Request as NodeFetchRequest } from 'node-fetch'
import { vi } from 'vitest'
import { Hono } from '../hono'
import type { Equal, Expect } from '../utils/types'
import { validator } from '../validator'
import { hc } from './client'
import type { InferRequestType, InferResponseType } from './types'

// @ts-ignore
global.fetch = _fetch
// @ts-ignore
global.Request = NodeFetchRequest
// @ts-ignore
global.FormData = FormData

describe('Basic - JSON', () => {
  const app = new Hono()

  const route = app
    .post(
      '/posts',
      // Client does not support `cookie`
      validator('cookie', () => {
        return {} as {
          debug: string
        }
      }),
      // Client does not support `header`
      validator('header', () => {
        return {} as {
          'x-request-id': string
        }
      }),
      validator('json', () => {
        return {} as {
          id: number
          title: string
        }
      }),
      (c) => {
        return c.jsonT({
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
      },
      {
        headers: {
          'x-message': 'foobar',
        },
      }
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
})

describe('Basic - query, queries, form, and path params', () => {
  const app = new Hono()

  const route = app
    .get(
      '/search',
      validator('query', () => {
        return {} as { q: string; tag: string[]; filter: string }
      }),
      (c) => {
        return c.jsonT({
          q: 'fake',
          tag: ['fake'],
          filter: 'fake',
        })
      }
    )
    .get(
      '/posts',
      validator('queries', () => {
        return {
          tags: ['a', 'b'],
        }
      }),
      (c) => {
        const data = c.req.valid('queries')
        return c.jsonT(data)
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
        return c.jsonT(data)
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

  it('Should get 200 response - queries', async () => {
    const res = await client.posts.$get({
      queries: {
        tags: ['A', 'B', 'C'],
      },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      tags: ['A', 'B', 'C'],
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
    (c) =>
      c.jsonT({
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
      age: string
      name: string
    }
    type verify = Expect<Equal<Expected, Actual['query']>>
  })

  describe('Without input', () => {
    const route = app.get('/', (c) => c.jsonT({ ok: true }))
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
    const api = new Hono<Env>().get('/search', (c) => c.jsonT({ ok: true }))
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
    const app = base.get('/search', (c) => c.jsonT({ ok: true }))
    type AppType = typeof app
    const client = hc<AppType>('http://localhost')
    const res = await client.api.search.$get()
    const data = await res.json()
    type verify = Expect<Equal<boolean, typeof data.ok>>
    expect(data.ok).toBe(true)
  })

  it('Should have correct types - basePath(), route(), get()', async () => {
    const book = new Hono().get('/', (c) => c.jsonT({ ok: true }))
    const app = new Hono().basePath('/v1').route('/book', book)
    type AppType = typeof app
    const client = hc<AppType>('http://localhost')
    const res = await client.v1.book.index.$get()
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
    const app = base.get('/search', (c) => c.jsonT(result))
    type AppType = typeof app
    const client = hc<AppType>('http://localhost')
    const res = await client.api.search.$get()
    const data = await res.json()
    type verify = Expect<Equal<Result, typeof data>>
    expect(data.ok).toBe(true)
  })

  it('Should not allow the incorrect JSON type', async () => {
    const app = new Hono()
    // @ts-expect-error
    const route = app.get('/api/foo', (c) => c.jsonT({ datetime: new Date() }))
    type AppType = typeof route
    const client = hc<AppType>('http://localhost')
    const res = await client.api.foo.$get()
    const data = await res.json()
    type verify = Expect<Equal<never, typeof data>>
  })

  describe('Multiple endpoints', () => {
    const api = new Hono()
      .get('/foo', (c) => c.jsonT({ foo: '' }))
      .post('/bar', (c) => c.jsonT({ bar: 0 }))
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
  })
})

describe('Use custom fetch method', () => {
  it('Should call the custom fetch method when provided', async () => {
    const fetchMock = vi.fn()

    const api = new Hono().get('/search', (c) => c.jsonT({ ok: true }))
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

    const api = new Hono().get('/search', (c) => c.jsonT({ ok: true }))
    const app = new Hono().route('/api', api)
    type AppType = typeof app
    const client = hc<AppType>('http://localhost', { fetch: fetchMock })
    const res = await client.api.search.$get()
    expect(res.ok).toBe(true)
    expect(res).toEqual(returnValue)
  })
})
