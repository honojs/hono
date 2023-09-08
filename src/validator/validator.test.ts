/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ZodSchema } from 'zod'
import { z } from 'zod'
import { Hono } from '../hono'
import type { ExtractSchema, MiddlewareHandler, ValidationTargets } from '../types'
import type { Equal, Expect } from '../utils/types'
import type { ValidationFunction } from './validator'
import { validator } from './validator'

// Reference implementation for only testing
const zodValidator = <
  T extends ZodSchema,
  E extends {},
  P extends string,
  Target extends keyof ValidationTargets
>(
  target: Target,
  schema: T
): MiddlewareHandler<
  E,
  P,
  { in: { [K in Target]: z.input<T> }; out: { [K in Target]: z.output<T> } }
> =>
  validator(target, (value, c) => {
    const result = schema.safeParse(value)
    if (!result.success) {
      return c.text('Invalid!', 400)
    }
    const data = result.data as z.output<T>
    return data
  })

describe('Validator middleware', () => {
  const app = new Hono()

  const route = app.get(
    '/search',
    async (_c, next) => {
      await next()
    },
    validator('query', (value, c) => {
      type verify = Expect<Equal<Record<string, string | string[]>, typeof value>>
      if (!value) {
        return c.text('Invalid!', 400)
      }
    }),
    (c) => {
      return c.text('Valid!')
    }
  )

  type Expected = {
    '/search': {
      $get: {
        input: {
          query: undefined
        }
        output: {}
      }
    }
  }

  type Actual = ExtractSchema<typeof route>

  type verify = Expect<Equal<Expected, Actual>>

  it('Should return 200 response', async () => {
    const res = await app.request('http://localhost/search?q=foo')
    expect(res.status).toBe(200)
  })

  it('Should return 400 response', async () => {
    const res = await app.request('http://localhost/search')
    expect(res.status).toBe(200)
  })
})

describe('Malformed JSON', () => {
  const app = new Hono()

  app.post(
    '/post',
    validator('json', (value, c) => {}),
    (c) => {
      return c.text('Valid!')
    }
  )

  it('Should return 400 response', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
    })
    expect(res.status).toBe(400)
  })
})

describe('Validator middleware with a custom validation function', () => {
  const app = new Hono()

  const validationFunction: ValidationFunction<{ id: string }, { id: number }> = (v) => {
    return {
      id: Number(v.id),
    }
  }

  const route = app.post('/post', validator('json', validationFunction), (c) => {
    const post = c.req.valid('json')
    type Expected = {
      id: number
    }
    type verify = Expect<Equal<Expected, typeof post>>
    return c.jsonT({
      post,
    })
  })

  type Expected = {
    '/post': {
      $post: {
        input: {
          json: {
            id: string
          }
        }
        output: {
          post: {
            id: number
          }
        }
      }
    }
  }

  type Actual = ExtractSchema<typeof route>
  type verify2 = Expect<Equal<Expected, Actual>>

  it('Should validate JSON with transformation and return 200 response', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      body: JSON.stringify({
        id: '123',
      }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      post: {
        id: 123,
      },
    })
  })
})

describe('Validator middleware with Zod validates JSON', () => {
  const app = new Hono()

  const schema = z.object({
    id: z.number(),
    title: z.string(),
  })

  const route = app.post('/post', zodValidator('json', schema), (c) => {
    const post = c.req.valid('json')
    type Expected = {
      id: number
      title: string
    }
    type verify = Expect<Equal<Expected, typeof post>>
    return c.jsonT({
      post: post,
    })
  })

  type Expected = {
    '/post': {
      $post: {
        input: {
          json: {
            id: number
            title: string
          }
        }
        output: {
          post: {
            id: number
            title: string
          }
        }
      }
    }
  }

  type Actual = ExtractSchema<typeof route>

  type verify2 = Expect<Equal<Expected, Actual>>

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
  app.post('/post', zodValidator('form', schema), (c) => {
    const post = c.req.valid('form')
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
    tag: z.array(z.string()),
  })

  app.get('/search', zodValidator('query', schema), (c) => {
    const res = c.req.valid('query')
    return c.jsonT({
      page: res.page,
      tags: res.tag,
    })
  })

  it('Should validate query params and return 200 response', async () => {
    const res = await app.request('http://localhost/search?page=123&tag=a&tag=b')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      page: 123,
      tags: ['a', 'b'],
    })
  })

  it('Should validate query params and return 400 response', async () => {
    const res = await app.request('http://localhost/search?page=onetwothree')
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('Invalid!')
  })
})

describe('Validator middleware with Zod validates queries params - with `queries` will be obsolete in v4', () => {
  const app = new Hono()

  const schema = z.object({
    tags: z.array(z.string()),
  })

  app.get('/posts', zodValidator('queries', schema), (c) => {
    const res = c.req.valid('queries')
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

describe('Validator middleware with Zod validates param', () => {
  const app = new Hono()

  const schema = z.object({
    id: z
      .string()
      .regex(/^[0-9]+$/)
      .transform((v) => {
        return Number(v)
      }),
    title: z.string(),
  })
  app.get('/users/:id/books/:title', zodValidator('param', schema), (c) => {
    const param = c.req.valid('param')
    return c.jsonT({
      param: param,
    })
  })

  it('Should validate Form data and return 200 response', async () => {
    const res = await app.request('http://localhost/users/123/books/Hello')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      param: {
        id: 123,
        title: 'Hello',
      },
    })
  })

  it('Should validate Form data and return 400 response', async () => {
    const res = await app.request('http://localhost/users/0.123/books/Hello')
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('Invalid!')
  })
})

describe('Validator middleware with Zod validates header values', () => {
  const app = new Hono()

  const schema = z.object({
    'x-request-id': z.string().uuid(),
  })

  app.get('/ping', zodValidator('header', schema), (c) => {
    const data = c.req.valid('header')
    const xRequestId = data['x-request-id']
    return c.jsonT({
      xRequestId,
    })
  })

  it('Should validate header values and return 200 response', async () => {
    const res = await app.request('/ping', {
      headers: {
        'x-request-id': '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b',
      },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      xRequestId: '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b',
    })
  })

  it('Should validate header values and return 400 response', async () => {
    const res = await app.request('http://localhost/ping', {
      headers: {
        'x-request-id': 'invalid-key',
      },
    })
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('Invalid!')
  })
})

describe('Validator middleware with Zod validates cookies', () => {
  const app = new Hono()

  const schema = z.object({
    debug: z.enum(['0', '1']),
  })

  app.get('/api/user', zodValidator('cookie', schema), (c) => {
    const { debug } = c.req.valid('cookie')
    return c.jsonT({
      debug,
    })
  })

  it('Should validate cookies and return 200 response', async () => {
    const res = await app.request('/api/user', {
      headers: {
        Cookie: 'debug=0',
      },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      debug: '0',
    })
  })

  it('Should validate cookies and return 400 response', async () => {
    const res = await app.request('/api/user', {
      headers: {
        Cookie: 'debug=true',
      },
    })
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('Invalid!')
  })
})

describe('Validator middleware with Zod multiple validators', () => {
  const app = new Hono<{ Variables: { id: number } }>()
  const route = app.post(
    '/posts',
    zodValidator(
      'query',
      z.object({
        page: z
          .string()
          .refine((v) => {
            return !isNaN(Number(v))
          })
          .transform((v) => {
            return Number(v)
          }),
      })
    ),
    zodValidator(
      'form',
      z.object({
        title: z.string(),
      })
    ),
    (c) => {
      const id = c.get('id')
      type verify = Expect<Equal<number, typeof id>>
      const formValidatedData = c.req.valid('form')
      type verify2 = Expect<Equal<{ title: string }, typeof formValidatedData>>
      const { page } = c.req.valid('query')
      const { title } = c.req.valid('form')
      return c.jsonT({ page, title })
    }
  )

  type Actual = ExtractSchema<typeof route>

  type Expected = {
    '/posts': {
      $post: {
        input: {
          query: {
            page: string
          }
        } & {
          form: {
            title: string
          }
        }
        output: {
          page: number
          title: string
        }
      }
    }
  }

  type verify = Expect<Equal<Expected, Actual>>

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

it('With path parameters', () => {
  const app = new Hono()

  const route = app.put(
    '/posts/:id',
    validator('form', () => {
      return {
        title: 'Foo',
      }
    }),
    (c) => {
      return c.text('Valid!')
    }
  )

  type Expected = {
    '/posts/:id': {
      $put: {
        input: {
          form: {
            title: string
          }
        } & {
          param: {
            id: string
          }
        }
        output: {}
      }
    }
  }

  type Actual = ExtractSchema<typeof route>
  type verify = Expect<Equal<Expected, Actual>>
})

it('`on`', () => {
  const app = new Hono()

  const route = app.on(
    'PURGE',
    '/purge',
    validator('form', () => {
      return {
        tag: 'foo',
      }
    }),
    validator('query', () => {
      return {
        q: 'bar',
      }
    }),
    (c) => {
      return c.jsonT({
        success: true,
      })
    }
  )

  type Expected = {
    '/purge': {
      $purge: {
        input: {
          form: {
            tag: string
          }
        } & {
          query: {
            q: string
          }
        }
        output: {
          success: boolean
        }
      }
    }
  }

  type Actual = ExtractSchema<typeof route>
  type verify = Expect<Equal<Expected, Actual>>
})

it('`app.on`', () => {
  const app = new Hono()

  const route = app
    .get(
      '/posts',
      validator('query', () => {
        return {
          page: '2',
        }
      }),
      (c) => {
        return c.jsonT({
          posts: [
            {
              title: 'foo',
            },
          ],
        })
      }
    )
    .post(
      validator('json', () => {
        return {
          title: 'Hello',
        }
      }),
      validator('query', () => {
        return {
          title: 'Hello',
        }
      }),
      (c) => {
        return c.jsonT({
          success: true,
        })
      }
    )

  type Actual = ExtractSchema<typeof route>
  //type verify = Expect<Equal<Expected, Actual>>
})

describe('Clone Request object', () => {
  describe('json', () => {
    const app = new Hono()
    app.post(
      '/',
      validator('json', () => {
        return {
          foo: 'bar',
        }
      }),
      async (c) => {
        // `c.req.json()` should not throw the error
        await c.req.json()
        // `c.req.text()` should not throw the error
        await c.req.text()
        // `c.req.arrayBuffer()` should not throw the error
        await c.req.arrayBuffer()
        // `c.req.blob()` should not throw the error
        await c.req.blob()
        return c.text('foo')
      }
    )

    it('Should not throw the error with c.req.json()', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ foo: 'bar' }),
      })
      const res = await app.request(req)
      expect(res.status).toBe(200)
    })
  })

  describe('form', () => {
    const app = new Hono()
    app.post(
      '/',
      validator('form', () => {
        return {
          foo: 'bar',
        }
      }),
      async (c) => {
        // `c.req.parseBody()` should not throw the error
        await c.req.parseBody()
        // `c.req.text()` should not throw the error
        await c.req.text()
        // `c.req.arrayBuffer()` should not throw the error
        await c.req.arrayBuffer()
        // `c.req.blob()` should not throw the error
        await c.req.blob()
        return c.text('foo')
      }
    )

    it('Should not throw the error with c.req.parseBody()', async () => {
      const body = new FormData()
      body.append('foo', 'bar')
      const req = new Request('http://localhost', {
        method: 'POST',
        body: body,
      })
      const res = await app.request(req)
      expect(res.status).toBe(200)
    })
  })
})

describe('Async validator function', () => {
  const app = new Hono()

  app.get(
    '/posts',
    validator('query', async () => {
      return {
        page: '1',
      }
    }),
    (c) => {
      const { page } = c.req.valid('query')
      return c.json({ page })
    }
  )

  it('Should get the values from the async function', async () => {
    const res = await app.request('/posts')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      page: '1',
    })
  })
})
