/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import FormData from 'form-data'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import _fetch, { Request as NodeFetchRequest } from 'node-fetch'
import { Hono } from '../hono'
import type { Equal, Expect } from '../utils/types'
import { validator } from '../validator'
import { hc } from './client'
import type { InferResponseType } from './types'

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
      const requestMessage = req.headers.get('x-message')
      const requestBody = await req.json()
      const payload = {
        message: 'Hello!',
        success: true,
        requestContentType,
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

  const client = hc<AppType>('http://localhost')

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
        return {} as { q: string }
      }),
      (c) => {
        return c.jsonT({
          entries: [
            {
              title: 'Foo',
            },
          ],
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
      return res(
        ctx.status(200),
        ctx.json({
          q: query,
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
      },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      q: 'foobar',
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

describe('Infer the request type', () => {
  const app = new Hono()
  const route = app.get('/', (c) =>
    c.jsonT({
      id: 123,
      title: 'Morning!',
    })
  )

  type AppType = typeof route

  it('Should infer the type correctly', () => {
    const client = hc<AppType>('/')
    const req = client.index.$get

    type Actual = InferResponseType<typeof req>
    type Expected = {
      id: number
      title: string
    }
    type verify = Expect<Equal<Expected, Actual>>
  })
})
