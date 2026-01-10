/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ZodSchema } from 'zod'
import { z } from 'zod'
import type { Context } from '../context'
import { Hono } from '../hono'
import { HTTPException } from '../http-exception'
import { cloneRawRequest } from '../request'
import type {
  ErrorHandler,
  ExtractSchema,
  ExtractSchemaForStatusCode,
  FormValue,
  MiddlewareHandler,
  TypedResponse,
  ValidationTargets,
} from '../types'
import type { ContentfulStatusCode, StatusCode } from '../utils/http-status'
import type { Equal, Expect } from '../utils/types'
import type { ValidationFunction } from './validator'
import { validator } from './validator'

// Helper type to extract the response type from the validation function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InferValidatorResponse<VF> = VF extends (value: any, c: any) => infer R
  ? R extends Promise<infer PR>
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      PR extends Response | TypedResponse<any, any, any>
      ? PR
      : never
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      R extends Response | TypedResponse<any, any, any>
      ? R
      : never
  : never

// Reference implementation for only testing
const zodValidator = <
  T extends ZodSchema,
  E extends {},
  P extends string,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: T
) => {
  const validationFunc = (value: unknown, c: Context<E, P>) => {
    const result = schema.safeParse(value)
    if (!result.success) {
      return c.text('Invalid!', 400)
    }
    return result.data as z.output<T>
  }

  type ResponseType = InferValidatorResponse<typeof validationFunc>

  return validator(target, validationFunc) as MiddlewareHandler<
    E,
    P,
    { in: { [K in Target]: z.input<T> }; out: { [K in Target]: z.output<T> } },
    ResponseType
  >
}

describe('Basic', () => {
  const app = new Hono()

  const route = app.get(
    '/search',
    async (_c, next) => {
      await next()
    },
    validator('query', (value, c) => {
      type verify = Expect<Equal<Record<string, string[]>, typeof value>>
      if (!value.q || value.q.length === 0) {
        return c.text('Invalid!', 400)
      }
    }),
    (c) => {
      return c.text('Valid!', 200)
    }
  )

  type Expected = {
    '/search': {
      $get:
        | {
            input: {
              query: {}
            }
            output: 'Invalid!'
            outputFormat: 'text'
            status: 400
          }
        | {
            input: {
              query: {}
            }
            output: 'Valid!'
            outputFormat: 'text'
            status: 200
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
    expect(res.status).toBe(400)
  })
})

const onErrorHandler: ErrorHandler = (e, c) => {
  if (e instanceof HTTPException) {
    return c.json({ message: e.message, success: false }, e.status)
  }
  return c.json({ message: e.message }, 500)
}

describe('JSON', () => {
  const app = new Hono()
  app.post(
    '/post',
    validator('json', (value) => value),
    (c) => {
      return c.json(c.req.valid('json'))
    }
  )

  it('Should return 200 response with a valid JSON data', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ foo: 'bar' })
  })

  it('Should not validate if Content-Type is not set', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.foo).toBeUndefined()
  })

  it('Should not validate if Content-Type is wrong', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ foo: 'bar' }),
    })
    expect(res.status).toBe(200)
  })

  it('Should validate if Content-Type is a application/json with a charset', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ foo: 'bar' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ foo: 'bar' })
  })

  it('Should validate if Content-Type is a subtype like application/merge-patch+json', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/merge-patch+json',
      },
      body: JSON.stringify({ foo: 'bar' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ foo: 'bar' })
  })

  it('Should validate if Content-Type is application/vnd.api+json', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({ foo: 'bar' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ foo: 'bar' })
  })

  it('Should not validate if Content-Type does not start with application/json', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'Xapplication/json',
      },
      body: JSON.stringify({ foo: 'bar' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.foo).toBeUndefined()
  })
})

describe('Malformed JSON', () => {
  const app = new Hono()
  app.post(
    '/post',
    validator('json', (value) => value),
    (c) => {
      return c.json(c.req.valid('json'))
    }
  )

  it('Should return 400 response if the body data is not a valid JSON', async () => {
    const formData = new FormData()
    formData.append('foo', 'bar')
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: formData,
    })
    expect(res.status).toBe(400)
  })
})

describe('FormData', () => {
  const app = new Hono()
  app.post(
    '/post',
    validator('form', (value) => value),
    (c) => {
      return c.json(c.req.valid('form'))
    }
  )

  it('Should return 200 response with a valid form data', async () => {
    const formData = new FormData()
    formData.append('message', 'hi')
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      body: formData,
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ message: 'hi' })
  })

  it('Should validate a URL Encoded Data', async () => {
    const params = new URLSearchParams()
    params.append('foo', 'bar')
    const res = await app.request('/post', {
      method: 'POST',
      body: params,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      foo: 'bar',
    })
  })

  it('Should validate if Content-Type is a application/x-www-form-urlencoded with a charset', async () => {
    const params = new URLSearchParams()
    params.append('foo', 'bar')
    const res = await app.request('/post', {
      method: 'POST',
      body: params,
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      foo: 'bar',
    })
  })

  it('Should return `foo[]` as an array', async () => {
    const form = new FormData()
    form.append('foo[]', 'bar1')
    form.append('foo[]', 'bar2')
    const res = await app.request('/post', {
      method: 'POST',
      body: form,
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      'foo[]': ['bar1', 'bar2'],
    })
  })

  it('Should return `foo` as an array if multiple values are appended', async () => {
    const form = new FormData()
    form.append('foo', 'bar1')
    form.append('foo', 'bar2')
    form.append('foo', 'bar3')
    const res = await app.request('/post', {
      method: 'POST',
      body: form,
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      foo: ['bar1', 'bar2', 'bar3'],
    })
  })
})

describe('Malformed FormData request', () => {
  const app = new Hono()
  app.post(
    '/post',
    validator('form', (value) => value),
    (c) => {
      return c.json(c.req.valid('form'))
    }
  )
  app.onError(onErrorHandler)

  it('Should return 400 response, for malformed content type header', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      body: 'hi',
      headers: {
        'content-type': 'multipart/form-data',
      },
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data['success']).toBe(false)
    expect(data['message']).toMatch(/^Malformed FormData request./)
  })
})

describe('JSON and FormData', () => {
  const app = new Hono()
  app.post(
    '/',
    validator('json', (value) => value),
    validator('form', (value) => value),
    async (c) => {
      const jsonData = c.req.valid('json')
      const formData = c.req.valid('form')
      return c.json({
        json: jsonData,
        form: formData,
      })
    }
  )

  it('Should validate a JSON request', async () => {
    const res = await app.request('/', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.json).toEqual({ foo: 'bar' })
  })

  it('Should validate a FormData request', async () => {
    const form = new FormData()
    form.append('foo', 'bar')
    const res = await app.request('/', {
      method: 'POST',
      body: form,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.form).toEqual({ foo: 'bar' })
  })
})

describe('Cached contents', () => {
  describe('json', () => {
    const app = new Hono()
    const bodyTypes = ['json', 'text', 'arrayBuffer', 'blob']

    for (const type of bodyTypes) {
      app.post(
        `/${type}`,
        async (c, next) => {
          // @ts-expect-error not type safe
          await c.req[type]()
          await next()
        },
        validator('json', (value) => {
          if (value instanceof Promise) {
            throw new Error('Value is Promise')
          }
          return value
        }),
        async (c) => {
          const data = await c.req.json()
          return c.json(data, 200)
        }
      )
    }

    for (const type of bodyTypes) {
      const endpoint = `/${type}`
      it(`Should return the cached JSON content - ${endpoint}`, async () => {
        const res = await app.request(endpoint, {
          method: 'POST',
          body: JSON.stringify({ message: 'Hello' }),
          headers: {
            'Content-Type': 'application/json',
          },
        })
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ message: 'Hello' })
      })
    }
  })

  describe('Cached content', () => {
    const app = new Hono()
    const bodyTypes = ['formData', 'text', 'arrayBuffer', 'blob']

    for (const type of bodyTypes) {
      app.post(
        `/${type}`,
        async (c, next) => {
          // @ts-expect-error not type safe
          await c.req[type]()
          await next()
        },
        validator('form', (value) => {
          if (value instanceof Promise) {
            throw new Error('Value is Promise')
          }
          return value
        }),
        async (c) => {
          return c.json({ message: 'OK' }, 200)
        }
      )
    }

    for (const type of bodyTypes) {
      const endpoint = `/${type}`
      it(`Should return the cached FormData content - ${endpoint}`, async () => {
        const form = new FormData()
        form.append('message', 'Hello')
        const res = await app.request(endpoint, {
          method: 'POST',
          body: form,
        })
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ message: 'OK' })
      })
    }
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
    return c.json({
      post,
    })
  })

  type Expected = {
    '/post': {
      $post:
        | {
            input: {
              json: {
                id: number
              }
            }
            output: {}
            outputFormat: string
            status: StatusCode
          }
        | {
            input: {
              json: {
                id: number
              }
            }
            output: {
              post: {
                id: number
              }
            }
            outputFormat: 'json'
            status: ContentfulStatusCode
          }
    }
  }

  type Actual = ExtractSchema<typeof route>
  type verify2 = Expect<Equal<Expected, Actual>>

  it('Should validate JSON with transformation and return 200 response', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    return c.json({
      post: post,
    })
  })

  type Expected = {
    '/post': {
      $post:
        | {
            input: {
              json: {
                id: number
                title: string
              }
            }
            output: 'Invalid!'
            outputFormat: 'text'
            status: 400
          }
        | {
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
            outputFormat: 'json'
            status: ContentfulStatusCode
          }
    }
  }

  type Actual = ExtractSchema<typeof route>

  type verify2 = Expect<Equal<Expected, Actual>>

  it('Should validate JSON and return 200 response', async () => {
    const res = await app.request('http://localhost/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
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
    return c.json({
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
      .array(z.string())
      .refine((v) => {
        return v.length === 1 && !isNaN(Number(v[0]))
      })
      .transform((v) => {
        return Number(v[0])
      }),
    tag: z.array(z.string()),
  })

  app.get('/search', zodValidator('query', schema), (c) => {
    const res = c.req.valid('query')
    return c.json({
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
    return c.json({
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
    return c.json({
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
    return c.json({
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
      return c.json({ page, title })
    }
  )

  type Actual = ExtractSchema<typeof route>

  type Expected = {
    '/posts': {
      $post:
        | {
            input: {
              query: {
                page: string
              }
            } & {
              form: {
                title: string
              }
            }
            output: 'Invalid!'
            outputFormat: 'text'
            status: 400
          }
        | {
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
            outputFormat: 'json'
            status: ContentfulStatusCode
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
    validator('param', () => {
      return {
        id: '123',
      }
    }),
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
            title: FormValue | FormValue[]
          }
        } & {
          param: {
            id: string
          }
        }
        output: 'Valid!'
        outputFormat: 'text'
        status: ContentfulStatusCode
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
      return c.json({
        success: true,
      })
    }
  )

  type Expected = {
    '/purge': {
      $purge: {
        input: {
          form: {
            tag: FormValue | FormValue[]
          }
        } & {
          query: {
            q: string[]
          }
        }
        output: {
          success: true
        }
        outputFormat: 'json'
        status: ContentfulStatusCode
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
        return c.json({
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
        return c.json({
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
        headers: {
          'Content-Type': 'application/json',
        },
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

    app.post(
      '/cached',
      async (c, next) => {
        await c.req.parseBody()
        await next()
      },
      validator('form', (value) => {
        if (value instanceof FormData) {
          throw new Error('The value should not be a FormData')
        }
        return value
      }),
      (c) => {
        const v = c.req.valid('form')
        return c.json(v)
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

    it('Should not be an instance of FormData if the formData is cached', async () => {
      const body = new FormData()
      body.append('foo', 'bar')
      const req = new Request('http://localhost/cached', {
        method: 'POST',
        body: body,
      })
      const res = await app.request(req)
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ foo: 'bar' })
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

describe('Validator with using Zod directly', () => {
  it('Should exclude Response & TypedResponse type', () => {
    const testSchema = z.object({
      name: z.string(),
      age: z.number(),
      type: z.enum(['a']),
    })
    const app = new Hono()

    const route = app.post(
      '/posts',
      validator('json', (value, c) => {
        const parsed = testSchema.safeParse(value)
        if (!parsed.success) {
          return c.json({ foo: 'bar' }, 401)
        }
        return parsed.data
      }),
      (c) => {
        const data = c.req.valid('json')
        expectTypeOf(data.name).toEqualTypeOf<string>()
        return c.json(
          {
            message: 'Created!',
          },
          201
        )
      }
    )

    expectTypeOf<ExtractSchemaForStatusCode<typeof route, 201>>().toEqualTypeOf<{
      '/posts': {
        $post: {
          input: {
            json: {
              type: 'a'
              name: string
              age: number
            }
          }
          output: {
            message: string
          }
          outputFormat: 'json'
          status: 201
        }
      }
    }>()

    expectTypeOf<ExtractSchemaForStatusCode<typeof route, 401>>().toEqualTypeOf<{
      '/posts': {
        $post: {
          input: {
            json: {
              type: 'a'
              name: string
              age: number
            }
          }
          output: {
            foo: string
          }
          outputFormat: 'json'
          status: 401
        }
      }
    }>()
  })
})

describe('Transform', () => {
  it('Should be number when the type is transformed', () => {
    const route = new Hono().get(
      '/',
      validator('query', async () => {
        return {
          page: 1,
        }
      }),
      (c) => {
        const { page } = c.req.valid('query')
        expectTypeOf(page).toEqualTypeOf<number>()
        return c.json({ page })
      }
    )

    type Expected = {
      '/': {
        $get: {
          input: {
            query: {
              page: string[]
            }
          }
          output: {
            page: number
          }
          outputFormat: 'json'
          status: ContentfulStatusCode
        }
      }
    }

    type Actual = ExtractSchema<typeof route>
    type verify = Expect<Equal<Expected, Actual>>

    // Temporary: let's see what the actual type is
    type TestActual = Actual
  })

  it('Should be number and union when the type is transformed', () => {
    const app = new Hono()
    const route = app.get(
      '/',
      validator('query', () => {
        return {
          page: 1,
          orderBy: 'asc',
        } as {
          page: number
          orderBy: 'asc' | 'desc'
          ordreByWithdefault?: 'asc' | 'desc' | undefined
        }
      }),
      (c) => {
        const { page, orderBy, ordreByWithdefault } = c.req.valid('query')
        expectTypeOf(page).toEqualTypeOf<number>()
        expectTypeOf(orderBy).toEqualTypeOf<'asc' | 'desc'>()
        expectTypeOf(ordreByWithdefault).toEqualTypeOf<'asc' | 'desc' | undefined>()
        return c.json({ page, orderBy, ordreByWithdefault })
      }
    )

    type Expected = {
      '/': {
        $get: {
          input: {
            query: {
              page: string[]
              orderBy: 'asc' | 'desc'
              ordreByWithdefault?: 'asc' | 'desc' | undefined
            }
          }
          output: {
            page: number
            orderBy: 'asc' | 'desc'
            ordreByWithdefault: 'asc' | 'desc' | undefined
          }
          outputFormat: 'json'
          status: ContentfulStatusCode
        }
      }
    }

    type Actual = ExtractSchema<typeof route>
    type verify = Expect<Equal<Expected, Actual>>

    // Temporary: let's see what the actual type is
    type TestActual = Actual
  })
})

describe('Raw Request cloning after validation', () => {
  it('Should allow the `cloneRawRequest` util to clone the request object after validation', async () => {
    const app = new Hono()

    app.post(
      '/json-validation',
      validator('json', (data) => data),
      async (c) => {
        const clonedReq = await cloneRawRequest(c.req)
        const clonedJSON = await clonedReq.json()

        return c.json({
          originalMethod: c.req.raw.method,
          clonedMethod: clonedReq.method,
          clonedUrl: clonedReq.url,
          clonedHeaders: {
            contentType: clonedReq.headers.get('Content-Type'),
            customHeader: clonedReq.headers.get('X-Custom-Header'),
          },
          originalCache: c.req.raw.cache,
          clonedCache: clonedReq.cache,
          originalCredentials: c.req.raw.credentials,
          clonedCredentials: clonedReq.credentials,
          originalMode: c.req.raw.mode,
          clonedMode: clonedReq.mode,
          originalRedirect: c.req.raw.redirect,
          clonedRedirect: clonedReq.redirect,
          originalReferrerPolicy: c.req.raw.referrerPolicy,
          clonedReferrerPolicy: clonedReq.referrerPolicy,
          cloned: JSON.stringify(clonedJSON) === JSON.stringify(await c.req.json()),
          payload: clonedJSON,
        })
      }
    )

    const testData = { message: 'test', userId: 123 }
    const res = await app.request('/json-validation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Header': 'test-value',
      },
      body: JSON.stringify(testData),
      cache: 'no-cache',
      credentials: 'include',
      mode: 'cors',
      redirect: 'follow',
      referrerPolicy: 'origin',
    })

    expect(res.status).toBe(200)

    const result = await res.json()

    expect(result.originalMethod).toBe('POST')
    expect(result.clonedMethod).toBe('POST')
    expect(result.clonedUrl).toBe('http://localhost/json-validation')
    expect(result.clonedHeaders.contentType).toBe('application/json')
    expect(result.clonedHeaders.customHeader).toBe('test-value')
    expect(result.clonedCache).toBe(result.originalCache)
    expect(result.clonedCredentials).toBe(result.originalCredentials)
    expect(result.clonedMode).toBe(result.originalMode)
    expect(result.clonedRedirect).toBe(result.originalRedirect)
    expect(result.clonedReferrerPolicy).toBe(result.originalReferrerPolicy)
    expect(result.cloned).toBe(true)
    expect(result.payload).toMatchObject(testData)
  })
})
