/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ZodSchema } from 'zod'
import { z } from 'zod'
import type { Context } from '../../context'
import { Hono } from '../../hono'
import type { Equal, Expect } from '../../utils/types'
import { validator } from '.'

const validatorFunc =
  <T extends ZodSchema>(schema: T) =>
  (value: unknown, c: Context) => {
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      return c.text('Invalid!', 400)
    }
    const data = parsed.data as z.infer<T>
    return data
  }

describe('Validator middleware with Zod validates JSON', () => {
  const app = new Hono()

  const schema = z.object({
    id: z.number(),
    title: z.string(),
  })

  const route = app
    .post('/post', validator('json', validatorFunc(schema)), (c) => {
      const post = c.req.valid()
      type ExpectType = {
        id: number
        title: string
      }
      type verify = Expect<Equal<ExpectType, typeof post>>
      return c.jsonT({
        post: post,
      })
    })
    .build()

  type ExpectBuildType = {
    post: {
      '/post': {
        input: {
          json: {
            id: number
            title: string
          }
        }
        output: {
          json: {
            post: {
              id: number
              title: string
            }
          }
        }
      }
    }
  }

  type AppType = typeof route

  // We don't get any errors with tsc or VS Code, but with jest we get errors and the test fails, so comment it out.
  // type verify2 = Expect<Equal<ExpectBuildType, AppType>>

  it('Should validate JSON and return 200 response', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      body: JSON.stringify({
        id: 123,
        title: 'Hello',
      }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      post: {
        id: 123,
        title: 'Hello',
      },
    })
  })

  it('Should validate JSON and return 400 response', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      body: JSON.stringify({
        id: '123',
        title: 'Hello',
      }),
    })
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('Invalid!')
  })
})

describe('Validator middleware with Zod validates Form data', () => {
  const app = new Hono()

  const schema = z.object({
    id: z.string(),
    title: z.string(),
  })
  app.post('/post', validator('form', validatorFunc(schema)), (c) => {
    const post = c.req.valid()
    return c.jsonT({
      post: post,
    })
  })

  it('Should validate Form data and return 200 response', async () => {
    const form = new FormData()
    form.append('id', '123')
    form.append('title', 'Hello')
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      body: form,
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      post: {
        id: '123',
        title: 'Hello',
      },
    })
  })

  it('Should validate Form data and return 400 response', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
    })
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('Invalid!')
  })
})

describe('Validator middleware with Zod validates query params', () => {
  const app = new Hono()

  const schema = z.object({
    page: z
      .string()
      .refine((v) => {
        return !isNaN(Number(v))
      })
      .transform((v) => {
        return Number(v)
      }),
  })

  app.get('/search', validator('query', validatorFunc(schema)), (c) => {
    const res = c.req.valid()
    return c.jsonT({
      page: res.page,
    })
  })

  it('Should validate query params and return 200 response', async () => {
    const res = await app.request('http://localhost/search?page=123')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      page: 123,
    })
  })

  it('Should validate query params and return 400 response', async () => {
    const res = await app.request('http://localhost/search?page=onetwothree')
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('Invalid!')
  })
})

describe('Validator middleware with Zod validates queries params', () => {
  const app = new Hono()

  const schema = z.object({
    tags: z.array(z.string()),
  })

  app.get('/posts', validator('queries', validatorFunc(schema)), (c) => {
    const res = c.req.valid()
    return c.jsonT({
      tags: res.tags,
    })
  })

  it('Should validate queries params and return 200 response', async () => {
    const res = await app.request('http://localhost/posts?tags=book&tags=movie')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      tags: ['book', 'movie'],
    })
  })

  it('Should validate queries params and return 400 response', async () => {
    const res = await app.request('http://localhost/posts')
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('Invalid!')
  })
})

describe('Validator middleware with Zod multiple validators', () => {
  const app = new Hono()

  const route = app
    .post(
      '/posts',
      validator('query', (value, c) => {
        const schema = z.object({
          page: z
            .string()
            .refine((v) => {
              return !isNaN(Number(v))
            })
            .transform((v) => {
              return Number(v)
            }),
        })
        const parsed = schema.safeParse(value)
        if (!parsed.success) {
          return c.text('Invalid!', 400)
        }
        const data = parsed.data as z.infer<typeof schema>
        return data
      }),
      validator('form', (value, c) => {
        const schema = z.object({
          title: z.string(),
        })
        const parsed = schema.safeParse(value)
        if (!parsed.success) {
          return c.text('Invalid!', 400)
        }
        const data = parsed.data as z.infer<typeof schema>
        return data
      }),
      (c) => {
        const res = c.req.valid()
        return c.jsonT({
          page: res.page,
          title: res.title,
        })
      }
    )
    .build()

  type AppType = typeof route

  type ExpectedType = {
    post: {
      '/posts': {
        input:
          | {
              query: {
                page: number
              }
            }
          | {
              form: {
                title: string
              }
            }
        output: {
          json: {
            page: number
            title: string
          }
        }
      }
    }
  }

  //type verify = Expect<Equal<ExpectedType, AppType>>

  it('Should validate both query param and form data and return 200 response', async () => {
    const form = new FormData()
    form.append('title', 'Hello')
    const res = await app.request('http://localhost/posts?page=2', {
      method: 'POST',
      body: form,
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      page: 2,
      title: 'Hello',
    })
  })

  it('Should validate both query param and form data and return 400 response', async () => {
    const res = await app.request('http://localhost/posts?page=2', {
      method: 'POST',
    })
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('Invalid!')
  })
})
