/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { expectTypeOf } from 'npm:vitest@0.34.3'
import type { Context } from './context.ts'
import { createMiddleware } from './helper.ts'
import { Hono } from './hono.ts'
import { poweredBy } from './middleware/powered-by/index.ts'
import type {
  Env,
  ExtractSchema,
  Handler,
  InputToDataByTarget,
  MergePath,
  MergeSchemaPath,
  MiddlewareHandler,
  ParamKeys,
  ParamKeyToRecord,
  RemoveQuestion,
  ToSchema,
  UndefinedIfHavingQuestion,
} from './types.ts'
import type { Expect, Equal } from './utils/types.ts'

describe('Env', () => {
  test('Env', () => {
    type E = {
      Variables: {
        foo: string
      }
      Bindings: {
        FLAG: boolean
      }
    }
    const app = new Hono<E>()
    app.use('*', poweredBy())
    app.get('/', (c) => {
      const foo = c.get('foo')
      expectTypeOf(foo).toEqualTypeOf<string>()
      const FLAG = c.env.FLAG
      expectTypeOf(FLAG).toEqualTypeOf<boolean>()
      return c.text('foo')
    })
  })
})

describe('HandlerInterface', () => {
  type Env = {}

  type Payload = { foo: string; bar: boolean }

  describe('no path pattern', () => {
    const app = new Hono<Env>()
    const middleware: MiddlewareHandler<
      Env,
      '/',
      {
        in: { json: Payload }
        out: { json: Payload }
      }
    > = async (_c, next) => {
      await next()
    }
    test('Context', () => {
      const route = app.get(middleware, (c) => {
        type Expected = Context<
          Env,
          '/',
          {
            in: { json: Payload }
            out: { json: Payload }
          }
        >
        expectTypeOf(c).toEqualTypeOf<Expected>()
        return c.jsonT({
          message: 'Hello!',
        })
      })
      app.get(middleware, (c) => {
        const data = c.req.valid('json')
        expectTypeOf(data).toEqualTypeOf<Payload>()
        return c.jsonT({
          message: 'Hello!',
        })
      })
      type Actual = ExtractSchema<typeof route>
      type Expected = {
        '/': {
          $get: {
            input: {
              json: Payload
            }
            output: {
              message: string
            }
          }
        }
      }
      type verify = Expect<Equal<Expected, Actual>>
    })
  })

  describe('path pattern', () => {
    const app = new Hono<Env>()
    const middleware: MiddlewareHandler<
      Env,
      '/foo',
      { in: { json: Payload }; out: { json: Payload } }
    > = async (_c, next) => {
      await next()
    }
    test('Context and AppType', () => {
      const route = app.get('/foo', middleware, (c) => {
        type Expected = Context<Env, '/foo', { in: { json: Payload }; out: { json: Payload } }>
        expectTypeOf(c).toEqualTypeOf<Expected>()
        return c.jsonT({
          message: 'Hello!',
        })
      })
      type Actual = ExtractSchema<typeof route>
      type Expected = {
        '/foo': {
          $get: {
            input: {
              json: {
                foo: string
                bar: boolean
              }
            }
            output: {
              message: string
            }
          }
        }
      }
      type verify = Expect<Equal<Expected, Actual>>
    })
  })

  describe('With path parameters', () => {
    const app = new Hono<Env>()
    const middleware: MiddlewareHandler<Env, '/post/:id'> = async (_c, next) => {
      await next()
    }
    it('Should have the `param` type', () => {
      const route = app.get('/post/:id', middleware, (c) => {
        return c.text('foo')
      })
      type Actual = ExtractSchema<typeof route>
      type Expected = {
        '/post/:id': {
          $get: {
            input: {
              param: {
                id: string
              }
            }
            output: {}
          }
        }
      }
      type verify = Expect<Equal<Expected, Actual>>
    })
  })

  describe('Without path', () => {
    const app = new Hono<Env>().basePath('/foo/:foo')

    it('With basePath and path params', () => {
      const route = app.get(async (c) => {
        const foo = c.req.param('foo')
        expect(typeof foo).toBe('string')
        return c.text(foo)
      })
      type Actual = ExtractSchema<typeof route>

      type Expected = {
        '/foo/:foo': {
          $get: {
            input: {
              param: {
                foo: string
              }
            }
            output: {}
          }
        }
      }
      type verify = Expect<Equal<Expected, Actual>>
    })

    it('Chained', () => {
      const route = app.post('/books/:id').get((c) => {
        const id = c.req.param('id')
        return c.text(id)
      })
      type Actual = ExtractSchema<typeof route>
      type Expected = {
        '/foo/:foo/books/:id': {
          $get: {
            input: {
              param: {
                id: string
              } & {
                foo: string
              }
            }
            output: {}
          }
        }
      } & {
        '/foo/:foo/books/:id': {
          $post: {
            input: {
              param: {
                id: string
              } & {
                foo: string
              }
            }
            output: {}
          }
        }
      }
      type verify = Expect<Equal<Expected, Actual>>
    })
  })
})

describe('OnHandlerInterface', () => {
  const app = new Hono()
  test('Context', () => {
    const middleware: MiddlewareHandler<
      Env,
      '/purge',
      { in: { form: { id: string } }; out: { form: { id: number } } }
    > = async (_c, next) => {
      await next()
    }
    const route = app.on('PURGE', '/purge', middleware, (c) => {
      const data = c.req.valid('form')
      expectTypeOf(data).toEqualTypeOf<{ id: number }>()
      return c.jsonT({
        success: true,
      })
    })
    type Actual = ExtractSchema<typeof route>
    type Expected = {
      '/purge': {
        $purge: {
          input: {
            form: {
              id: string
            }
          }
          output: {
            success: boolean
          }
        }
      }
    }
    type verify = Expect<Equal<Expected, Actual>>
  })
})

describe('Schema', () => {
  test('Schema', () => {
    type AppType = Hono<
      Env,
      ToSchema<
        'post',
        '/api/posts/:id',
        {
          json: {
            id: number
            title: string
          }
        },
        {
          message: string
          success: boolean
        }
      >
    >

    type Actual = ExtractSchema<AppType>
    type Expected = {
      '/api/posts/:id': {
        $post: {
          input: {
            json: {
              id: number
              title: string
            }
          } & {
            param: {
              id: string
            }
          }
          output: {
            message: string
            success: boolean
          }
        }
      }
    }
    type verify = Expect<Equal<Expected, Actual>>
  })
})

describe('Test types of Handler', () => {
  type E = {
    Variables: {
      foo: number
    }
  }

  const url = 'http://localhost/'

  test('Env', async () => {
    const app = new Hono<E>()
    const handler: Handler<E> = (c) => {
      const foo = c.get('foo')
      expectTypeOf(foo).toEqualTypeOf<number>()
      const id = c.req.param('id')
      expectTypeOf(id).toEqualTypeOf<string>()
      return c.text('Hi')
    }
    app.get('/', handler)
    const res = await app.request(url)
    expect(res.status).toBe(200)
  })

  test('Env, Path', async () => {
    const app = new Hono<E>()
    const handler: Handler<E, '/'> = (c) => {
      const foo = c.get('foo')
      expectTypeOf(foo).toEqualTypeOf<number>()
      return c.text('Hi')
    }
    app.get('/', handler)

    const res = await app.request(url)
    expect(res.status).toBe(200)
  })

  type User = {
    name: string
    age: number
  }

  test('Env, Path, Type', async () => {
    const app = new Hono<E>()
    const handler: Handler<E, '/', { in: { json: User }; out: { json: User } }> = (c) => {
      const foo = c.get('foo')
      expectTypeOf(foo).toEqualTypeOf<number>()
      const { name } = c.req.valid('json')
      expectTypeOf(name).toEqualTypeOf<string>()
      return c.text('Hi')
    }
  })
})

describe('`jsonT()`', () => {
  const app = new Hono<{ Variables: { foo: string } }>()

  app.get('/post/:id', (c) => {
    c.req.param('id')
    const id = c.req.param('id')
    return c.text('foo')
  })

  const route = app.get('/hello', (c) => {
    return c.jsonT({
      message: 'Hello!',
    })
  })

  test('jsonT', () => {
    type Actual = ExtractSchema<typeof route>

    type Expected = {
      '/hello': {
        $get: {
          input: {}
          output: {
            message: string
          }
        }
      }
    }

    type verify = Expect<Equal<Expected, Actual>>
  })
})

describe('Path parameters', () => {
  test('ParamKeys', () => {
    type Actual = ParamKeys<'/posts/:postId/comment/:commentId'>
    type Expected = 'postId' | 'commentId'
    type verify = Expect<Equal<Expected, Actual>>
  })

  describe('ParamKeyToRecord', () => {
    test('With ?', () => {
      type Actual = ParamKeyToRecord<'/animal/type?'>
      type Expected = { [K in '/animal/type']: string | undefined }
      type verify = Expect<Equal<Expected, Actual>>
    })
    test('Without ?', () => {
      type Actual = ParamKeyToRecord<'/animal/type'>
      type Expected = { [K in '/animal/type']: string }
      type verify = Expect<Equal<Expected, Actual>>
    })
  })
})

describe('For HonoRequest', () => {
  type Input = {
    json: {
      id: number
      title: string
    }
    query: {
      page: string
    }
  }

  test('InputToDataByType with value', () => {
    type Actual = InputToDataByTarget<Input, 'json'>
    type Expected = {
      id: number
      title: string
    }
    type verify = Expect<Equal<Expected, Actual>>
  })

  test('InputToDataByType without value', () => {
    type Actual = InputToDataByTarget<Input, 'form'>
    type verify = Expect<Equal<never, Actual>>
  })

  test('RemoveQuestion', () => {
    type Actual = RemoveQuestion<'/animal/type?'>
    type verify = Expect<Equal<'/animal/type', Actual>>
  })

  describe('UndefinedIfHavingQuestion', () => {
    test('With ?', () => {
      type Actual = UndefinedIfHavingQuestion<'/animal/type?'>
      type verify = Expect<Equal<string | undefined, Actual>>
    })
    test('Without ?', () => {
      type Actual = UndefinedIfHavingQuestion<'/animal/type'>
      type verify = Expect<Equal<string, Actual>>
    })
  })
})

describe('merge path', () => {
  test('MergePath', () => {
    type path1 = MergePath<'/api', '/book'>
    type verify1 = Expect<Equal<'/api/book', path1>>
    type path2 = MergePath<'/api/', '/book'>
    type verify2 = Expect<Equal<'/api/book', path2>>
    type path3 = MergePath<'/api/', '/'>
    type verify3 = Expect<Equal<'/api/', path3>>
    type path4 = MergePath<'/api', '/'>
    type verify4 = Expect<Equal<'/api', path4>>
  })

  test('MergeSchemaPath', () => {
    type Sub = ToSchema<
      'post',
      '/posts',
      {
        json: {
          id: number
          title: string
        }
      },
      {
        message: string
      }
    > &
      ToSchema<
        'get',
        '/posts',
        {},
        {
          ok: boolean
        }
      >

    type Actual = MergeSchemaPath<Sub, '/api'>

    type Expected = {
      '/api/posts': {
        $post: {
          input: {
            json: {
              id: number
              title: string
            }
          }
          output: {
            message: string
          }
        }
      } & {
        $get: {
          input: {}
          output: {
            ok: boolean
          }
        }
      }
    }

    type verify = Expect<Equal<Expected, Actual>>
  })

  type GetKey<T> = T extends Record<infer K, unknown> ? K : never

  it('Should remove a slash - `/` + `/`', () => {
    type Sub = ToSchema<'get', '/', {}, {}>
    type Actual = MergeSchemaPath<Sub, '/'>
    type verify = Expect<Equal<'/', GetKey<Actual>>>
  })

  it('Should remove a slash - `/tags` + `/`', () => {
    type Sub = ToSchema<'get', '/tags', {}, {}>
    type Actual = MergeSchemaPath<Sub, '/'>
    type verify = Expect<Equal<'/tags', GetKey<Actual>>>
  })

  it('Should remove a slash - `/` + `/tags`', () => {
    type Sub = ToSchema<'get', '/', {}, {}>
    type Actual = MergeSchemaPath<Sub, '/tags'>
    type verify = Expect<Equal<'/tags', GetKey<Actual>>>
  })
})

describe('Different types using jsonT()', () => {
  describe('no path pattern', () => {
    const app = new Hono()
    test('Three different types', () => {
      const route = app.get((c) => {
        const flag = false
        if (flag) {
          return c.jsonT({
            ng: true,
          })
        }
        if (!flag) {
          return c.jsonT({
            ok: true,
          })
        }
        return c.jsonT({
          default: true,
        })
      })
      type Actual = ExtractSchema<typeof route>
      type Expected = {
        '/': {
          $get: {
            input: {}
            output:
              | {
                  ng: boolean
                }
              | {
                  ok: boolean
                }
              | {
                  default: boolean
                }
          }
        }
      }
      type verify = Expect<Equal<Expected, Actual>>
    })
  })

  describe('path pattern', () => {
    const app = new Hono()
    test('Three different types', () => {
      const route = app.get('/foo', (c) => {
        const flag = false
        if (flag) {
          return c.jsonT({
            ng: true,
          })
        }
        if (!flag) {
          return c.jsonT({
            ok: true,
          })
        }
        return c.jsonT({
          default: true,
        })
      })
      type Actual = ExtractSchema<typeof route>
      type Expected = {
        '/foo': {
          $get: {
            input: {}
            output:
              | {
                  ng: boolean
                }
              | {
                  ok: boolean
                }
              | {
                  default: boolean
                }
          }
        }
      }
      type verify = Expect<Equal<Expected, Actual>>
    })
  })
})

describe('jsonT() in an async handler', () => {
  const app = new Hono()
  test('Three different types', () => {
    const route = app.get(async (c) => {
      return c.jsonT({
        ok: true,
      })
    })
    type Actual = ExtractSchema<typeof route>
    type Expected = {
      '/': {
        $get: {
          input: {}
          output: {
            ok: boolean
          }
        }
      }
    }
    type verify = Expect<Equal<Expected, Actual>>
  })
})

/**
 * Other tests for `c.var` are written in `hono.test.ts`.
 * This tests are only for types.
 */
describe('c.var with chaining - test only types', () => {
  const mw1 = createMiddleware<{ Variables: { foo1: string } }>(async () => {})
  const mw2 = createMiddleware<{ Variables: { foo2: string } }>(async () => {})
  const mw3 = createMiddleware<{ Variables: { foo3: string } }>(async () => {})
  const mw4 = createMiddleware<{ Variables: { foo4: string } }>(async () => {})
  const mw5 = createMiddleware<{ Variables: { foo5: string } }>(async () => {})

  it('Should not throw type errors', () => {
    // app.get(handler...)

    new Hono().get(mw1).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      return c.json(0)
    })

    new Hono().get(mw1, mw2).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
      return c.json(0)
    })

    new Hono().get(mw1, mw2, mw3).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
      return c.json(0)
    })

    new Hono().get(mw1, mw2, mw3, mw4).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
      return c.json(0)
    })

    new Hono().get(mw1, mw2, mw3, mw4, mw5).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo5).toEqualTypeOf<string>()
      return c.json(0)
    })

    // app.get('/', handler...)

    new Hono().get('/', mw1).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      return c.json(0)
    })

    new Hono().get('/', mw1, mw2).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
      return c.json(0)
    })

    new Hono().get('/', mw1, mw2, mw3).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
      return c.json(0)
    })

    new Hono().get('/', mw1, mw2, mw3, mw4).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
      return c.json(0)
    })

    new Hono().get('/', mw1, mw2, mw3, mw4, mw5).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo5).toEqualTypeOf<string>()
      return c.json(0)
    })
  })
})

/**
 *
 * Declaring a ContextVariableMap for testing.
 */
declare module './context.ts' {
  interface ContextVariableMap {
    payload: string
  }
}

describe('c.var with ContextVariableMap - test only types', () => {
  it('Should no throw a type error', () => {
    new Hono().get((c) => {
      expectTypeOf(c.get('payload')).toEqualTypeOf<string>()
      return c.json(0)
    })
    new Hono().get((c) => {
      expectTypeOf(c.var.payload).toEqualTypeOf<string>()
      return c.json(0)
    })
  })
})
