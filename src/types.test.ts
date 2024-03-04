/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { expectTypeOf } from 'vitest'
import type { Context } from './context'
import { createMiddleware } from './helper'
import { Hono } from './hono'
import { poweredBy } from './middleware/powered-by'
import type {
  AddParam,
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
} from './types'
import type { Expect, Equal } from './utils/types'
import { validator } from './validator'

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
        return c.json({
          message: 'Hello!',
        })
      })
      app.get(middleware, (c) => {
        const data = c.req.valid('json')
        expectTypeOf(data).toEqualTypeOf<Payload>()
        return c.json({
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
        return c.json({
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
      return c.json({
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

describe('Support c.json(undefined)', () => {
  it('Should return a correct type', () => {
    const app = new Hono().get('/this/is/a/test', async (c) => {
      return c.json(undefined)
    })
    type Actual = ExtractSchema<typeof app>
    type Expected = {
      '/this/is/a/test': {
        $get: {
          input: {}
          output: undefined
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

describe('`json()`', () => {
  const app = new Hono<{ Variables: { foo: string } }>()

  app.get('/post/:id', (c) => {
    c.req.param('id')
    const id = c.req.param('id')
    return c.text('foo')
  })

  const route = app.get('/hello', (c) => {
    return c.json({
      message: 'Hello!',
    })
  })

  test('json', () => {
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

describe('AddParam', () => {
  it('Should add params to input correctly', () => {
    type Actual = AddParam<
      {
        param: {
          id: string
        }
      } & {
        query: {
          page: string
        }
      },
      '/:id'
    >
    type Expected = {
      query: {
        page: string
      }
    } & {
      param: {
        id: string
      }
    }
    type verify = Expect<Equal<Expected, Actual>>
  })
})

describe('ToSchema', () => {
  it('Should convert parameters to schema correctly', () => {
    type Actual = ToSchema<'get', '/:id', { param: { id: string }; query: { page: string } }, {}>
    type Expected = {
      '/:id': {
        $get: {
          input: {
            param: {
              id: string
            }
            query: {
              page: string
            }
          }
          output: {}
        }
      }
    }
    type verify = Expect<Equal<Expected, Actual>>
  })
})

describe('MergePath', () => {
  it('Should merge paths correctly', () => {
    type path1 = MergePath<'/api', '/book'>
    type verify1 = Expect<Equal<'/api/book', path1>>
    type path2 = MergePath<'/api/', '/book'>
    type verify2 = Expect<Equal<'/api/book', path2>>
    type path3 = MergePath<'/api/', '/'>
    type verify3 = Expect<Equal<'/api/', path3>>
    type path4 = MergePath<'/api', '/'>
    type verify4 = Expect<Equal<'/api', path4>>
  })
})

describe('MergeSchemaPath', () => {
  it('Should merge schema and sub path correctly', () => {
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

  it('Should merge schema which has params and sub path does not have params', () => {
    type Actual = MergeSchemaPath<
      {
        '/': {
          $get: {
            input: {
              param: {
                id: string
              }
              query: {
                page: string
              }
            }
            output: {}
          }
        }
      },
      '/something'
    >
    type Expected = {
      '/something': {
        $get: {
          input: {
            param: {
              id: string
            }
            query: {
              page: string
            }
          }
          output: {}
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

  test('MergeSchemaPath - SubPath has path params', () => {
    type Actual = MergeSchemaPath<ToSchema<'get', '/', {}, {}>, '/a/:b'>
    type Expected = {
      '/a/:b': {
        $get: {
          input: {
            param: {
              b: string
            }
          }
          output: {}
        }
      }
    }
    type verify = Expect<Equal<Expected, Actual>>
  })

  test('MergeSchemaPath - Path and SubPath have path params', () => {
    type Actual = MergeSchemaPath<ToSchema<'get', '/c/:d', {}, {}>, '/a/:b'>
    type Expected = {
      '/a/:b/c/:d': {
        $get: {
          input: {
            param: {
              d: string
            } & {
              b: string
            }
          }
          output: {}
        }
      }
    }
    type verify = Expect<Equal<Expected, Actual>>
  })

  test('MergeSchemaPath - Path and SubPath have regexp path params', () => {
    type Actual = MergeSchemaPath<ToSchema<'get', '/c/:d{.+}', {}, {}>, '/a/:b{.+}'>
    type Expected = {
      '/a/:b{.+}/c/:d{.+}': {
        $get: {
          input: {
            param: {
              d: string
            } & {
              b: string
            }
          }
          output: {}
        }
      }
    }
    type verify = Expect<Equal<Expected, Actual>>
  })
})

describe('Different types using json()', () => {
  describe('no path pattern', () => {
    const app = new Hono()
    test('Three different types', () => {
      const route = app.get((c) => {
        const flag = false
        if (flag) {
          return c.json({
            ng: true,
          })
        }
        if (!flag) {
          return c.json({
            ok: true,
          })
        }
        return c.json({
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
          return c.json({
            ng: true,
          })
        }
        if (!flag) {
          return c.json({
            ok: true,
          })
        }
        return c.json({
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

describe('json() in an async handler', () => {
  const app = new Hono()
  test('Three different types', () => {
    const route = app.get(async (c) => {
      return c.json({
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
  const mw1 = createMiddleware<
    { Variables: { foo1: string } },
    string,
    { out: { query: { bar1: number } } }
  >(async () => {})
  const mw2 = createMiddleware<
    { Variables: { foo2: string } },
    string,
    { out: { query: { bar2: number } } }
  >(async () => {})
  const mw3 = createMiddleware<
    { Variables: { foo3: string } },
    string,
    { out: { query: { bar3: number } } }
  >(async () => {})
  const mw4 = createMiddleware<
    { Variables: { foo4: string } },
    string,
    { out: { query: { bar4: number } } }
  >(async () => {})
  const mw5 = createMiddleware<
    { Variables: { foo5: string } },
    string,
    { out: { query: { bar5: number } } }
  >(async () => {})
  const mw6 = createMiddleware<
    { Variables: { foo6: string } },
    string,
    { out: { query: { bar6: number } } }
  >(async () => {})
  const mw7 = createMiddleware<
    { Variables: { foo7: string } },
    string,
    { out: { query: { bar7: number } } }
  >(async () => {})
  const mw8 = createMiddleware<
    { Variables: { foo8: string } },
    string,
    { out: { query: { bar8: number } } }
  >(async () => {})
  const mw9 = createMiddleware<
    { Variables: { foo9: string } },
    string,
    { out: { query: { bar9: number } } }
  >(async () => {})
  const mw10 = createMiddleware<
    { Variables: { foo10: string } },
    string,
    { out: { query: { bar10: number } } }
  >(async () => {})

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

    new Hono().get(mw1, mw2, mw3, mw4, mw5, mw6).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo5).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo6).toEqualTypeOf<string>()
      return c.json(0)
    })

    new Hono().get(mw1, mw2, mw3, mw4, mw5, mw6, mw7).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo5).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo6).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo7).toEqualTypeOf<string>()
      return c.json(0)
    })

    new Hono().get(mw1, mw2, mw3, mw4, mw5, mw6, mw7, mw8).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo5).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo6).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo7).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo8).toEqualTypeOf<string>()
      return c.json(0)
    })

    new Hono().get(mw1, mw2, mw3, mw4, mw5, mw6, mw7, mw8, mw9).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo5).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo6).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo7).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo8).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo9).toEqualTypeOf<string>()
      return c.json(0)
    })

    new Hono().get(mw1, mw2, mw3, mw4, mw5, mw6, mw7, mw8, mw9, mw10).get('/', (c) => {
      expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo5).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo6).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo7).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo8).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo9).toEqualTypeOf<string>()
      expectTypeOf(c.var.foo10).toEqualTypeOf<string>()
      return c.json(0)
    })

    new Hono().get(mw1, mw2, mw3, mw4, mw5, mw6, mw7, mw8, mw9, (c) => {
      expectTypeOf(c.req.valid('query')).toMatchTypeOf<{
        bar1: number
        bar2: number
        bar3: number
        bar4: number
        bar5: number
        bar6: number
        bar7: number
        bar8: number
        bar9: number
      }>()

      return c.json(0)
    })

    new Hono().get('/', mw1, mw2, mw3, mw4, mw5, mw6, mw7, mw8, mw9, (c) => {
      expectTypeOf(c.req.valid('query')).toMatchTypeOf<{
        bar1: number
        bar2: number
        bar3: number
        bar4: number
        bar5: number
        bar6: number
        bar7: number
        bar8: number
        bar9: number
      }>()

      return c.json(0)
    })

    type Env = {
      Variables: {
        init: number
      }
    }

    new Hono<Env>()
      .get('/', mw1, (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        expectTypeOf(c.get('foo1')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
        return c.json(0)
      })
      .get('/', (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        // @ts-expect-error foo1 is not typed
        c.get('foo1')
        // @ts-expect-error foo1 is not typed
        c.var.foo1
        return c.json(0)
      })

    new Hono<Env>()
      .get('/', mw1, mw2, (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        expectTypeOf(c.get('foo1')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo2')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
        return c.json(0)
      })
      .get('/', (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        // @ts-expect-error foo1 is not typed
        c.get('foo1')
        // @ts-expect-error foo1 is not typed
        c.var.foo1
        // @ts-expect-error foo2 is not typed
        c.get('foo2')
        // @ts-expect-error foo2 is not typed
        c.var.foo2
        return c.json(0)
      })

    new Hono<Env>()
      .get('/', mw1, mw2, mw3, (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        expectTypeOf(c.get('foo1')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo2')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo3')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
        return c.json(0)
      })
      .get('/', (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        // @ts-expect-error foo1 is not typed
        c.get('foo1')
        // @ts-expect-error foo1 is not typed
        c.var.foo1
        // @ts-expect-error foo2 is not typed
        c.get('foo2')
        // @ts-expect-error foo2 is not typed
        c.var.foo2
        // @ts-expect-error foo3 is not typed
        c.get('foo3')
        // @ts-expect-error foo3 is not typed
        c.var.foo3
        return c.json(0)
      })

    new Hono<Env>()
      .get('/', mw1, mw2, mw3, mw4, (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        expectTypeOf(c.get('foo1')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo2')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo3')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo4')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
        return c.json(0)
      })
      .get('/', (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        // @ts-expect-error foo1 is not typed
        c.get('foo1')
        // @ts-expect-error foo1 is not typed
        c.var.foo1
        // @ts-expect-error foo2 is not typed
        c.get('foo2')
        // @ts-expect-error foo2 is not typed
        c.var.foo2
        // @ts-expect-error foo3 is not typed
        c.get('foo3')
        // @ts-expect-error foo3 is not typed
        c.var.foo3
        // @ts-expect-error foo4 is not typed
        c.get('foo4')
        // @ts-expect-error foo4 is not typed
        c.var.foo4
        return c.json(0)
      })

    new Hono<Env>()
      .get('/', mw1, mw2, mw3, mw4, mw5, (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        expectTypeOf(c.get('foo1')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo2')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo3')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo4')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo5')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo5).toEqualTypeOf<string>()
        return c.json(0)
      })
      .get('/', (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        // @ts-expect-error foo1 is not typed
        c.get('foo1')
        // @ts-expect-error foo1 is not typed
        c.var.foo1
        // @ts-expect-error foo2 is not typed
        c.get('foo2')
        // @ts-expect-error foo2 is not typed
        c.var.foo2
        // @ts-expect-error foo3 is not typed
        c.get('foo3')
        // @ts-expect-error foo3 is not typed
        c.var.foo3
        // @ts-expect-error foo4 is not typed
        c.get('foo4')
        // @ts-expect-error foo4 is not typed
        c.var.foo4
        // @ts-expect-error foo5 is not typed
        c.get('foo5')
        // @ts-expect-error foo5 is not typed
        c.var.foo5
        return c.json(0)
      })

    new Hono<Env>()
      .get('/', mw1, mw2, mw3, mw4, mw5, mw6, (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        expectTypeOf(c.get('foo1')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo2')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo3')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo4')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo5')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo5).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo6')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo6).toEqualTypeOf<string>()
        return c.json(0)
      })
      .get('/', (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        // @ts-expect-error foo1 is not typed
        c.get('foo1')
        // @ts-expect-error foo1 is not typed
        c.var.foo1
        // @ts-expect-error foo2 is not typed
        c.get('foo2')
        // @ts-expect-error foo2 is not typed
        c.var.foo2
        // @ts-expect-error foo3 is not typed
        c.get('foo3')
        // @ts-expect-error foo3 is not typed
        c.var.foo3
        // @ts-expect-error foo4 is not typed
        c.get('foo4')
        // @ts-expect-error foo4 is not typed
        c.var.foo4
        // @ts-expect-error foo5 is not typed
        c.get('foo5')
        // @ts-expect-error foo5 is not typed
        c.var.foo5
        // @ts-expect-error foo6 is not typed
        c.get('foo6')
        // @ts-expect-error foo6 is not typed
        c.var.foo6
        return c.json(0)
      })

    new Hono<Env>()
      .get('/', mw1, mw2, mw3, mw4, mw5, mw6, mw7, (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        expectTypeOf(c.get('foo1')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo2')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo3')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo4')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo5')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo5).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo6')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo6).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo7')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo7).toEqualTypeOf<string>()
        return c.json(0)
      })
      .get('/', (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        // @ts-expect-error foo1 is not typed
        c.get('foo1')
        // @ts-expect-error foo1 is not typed
        c.var.foo1
        // @ts-expect-error foo2 is not typed
        c.get('foo2')
        // @ts-expect-error foo2 is not typed
        c.var.foo2
        // @ts-expect-error foo3 is not typed
        c.get('foo3')
        // @ts-expect-error foo3 is not typed
        c.var.foo3
        // @ts-expect-error foo4 is not typed
        c.get('foo4')
        // @ts-expect-error foo4 is not typed
        c.var.foo4
        // @ts-expect-error foo5 is not typed
        c.get('foo5')
        // @ts-expect-error foo5 is not typed
        c.var.foo5
        // @ts-expect-error foo6 is not typed
        c.get('foo6')
        // @ts-expect-error foo6 is not typed
        c.var.foo6
        // @ts-expect-error foo7 is not typed
        c.get('foo7')
        // @ts-expect-error foo7 is not typed
        c.var.foo7
        return c.json(0)
      })

    new Hono<Env>()
      .get('/', mw1, mw2, mw3, mw4, mw5, mw6, mw7, mw8, (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        expectTypeOf(c.get('foo1')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo2')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo3')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo4')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo5')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo5).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo6')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo6).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo7')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo7).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo8')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo8).toEqualTypeOf<string>()
        return c.json(0)
      })
      .get('/', (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        // @ts-expect-error foo1 is not typed
        c.get('foo1')
        // @ts-expect-error foo1 is not typed
        c.var.foo1
        // @ts-expect-error foo2 is not typed
        c.get('foo2')
        // @ts-expect-error foo2 is not typed
        c.var.foo2
        // @ts-expect-error foo3 is not typed
        c.get('foo3')
        // @ts-expect-error foo3 is not typed
        c.var.foo3
        // @ts-expect-error foo4 is not typed
        c.get('foo4')
        // @ts-expect-error foo4 is not typed
        c.var.foo4
        // @ts-expect-error foo5 is not typed
        c.get('foo5')
        // @ts-expect-error foo5 is not typed
        c.var.foo5
        // @ts-expect-error foo6 is not typed
        c.get('foo6')
        // @ts-expect-error foo6 is not typed
        c.var.foo6
        // @ts-expect-error foo7 is not typed
        c.get('foo7')
        // @ts-expect-error foo7 is not typed
        c.var.foo7
        // @ts-expect-error foo8 is not typed
        c.get('foo8')
        // @ts-expect-error foo8 is not typed
        c.var.foo8
        return c.json(0)
      })

    new Hono<Env>()
      .get('/', mw1, mw2, mw3, mw4, mw5, mw6, mw7, mw8, mw9, (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        expectTypeOf(c.get('foo1')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo1).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo2')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo2).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo3')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo3).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo4')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo4).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo5')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo5).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo6')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo6).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo7')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo7).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo8')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo8).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo9')).toEqualTypeOf<string>()
        expectTypeOf(c.var.foo9).toEqualTypeOf<string>()
        return c.json(0)
      })
      .get('/', (c) => {
        expectTypeOf(c.get('init')).toEqualTypeOf<number>()
        expectTypeOf(c.var.init).toEqualTypeOf<number>()
        // @ts-expect-error foo1 is not typed
        c.get('foo1')
        // @ts-expect-error foo1 is not typed
        c.var.foo1
        // @ts-expect-error foo2 is not typed
        c.get('foo2')
        // @ts-expect-error foo2 is not typed
        c.var.foo2
        // @ts-expect-error foo3 is not typed
        c.get('foo3')
        // @ts-expect-error foo3 is not typed
        c.var.foo3
        // @ts-expect-error foo4 is not typed
        c.get('foo4')
        // @ts-expect-error foo4 is not typed
        c.var.foo4
        // @ts-expect-error foo5 is not typed
        c.get('foo5')
        // @ts-expect-error foo5 is not typed
        c.var.foo5
        // @ts-expect-error foo6 is not typed
        c.get('foo6')
        // @ts-expect-error foo6 is not typed
        c.var.foo6
        // @ts-expect-error foo7 is not typed
        c.get('foo7')
        // @ts-expect-error foo7 is not typed
        c.var.foo7
        // @ts-expect-error foo8 is not typed
        c.get('foo8')
        // @ts-expect-error foo8 is not typed
        c.var.foo8
        // @ts-expect-error foo9 is not typed
        c.get('foo9')
        // @ts-expect-error foo9 is not typed
        c.var.foo9
        return c.json(0)
      })
  })
})

/**
 *
 * Declaring a ContextVariableMap for testing.
 */
declare module './context' {
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

/**
 * It's challenge to test all cases. This is a minimal pattern.
 */
describe('Env types with chained routes - test only types', () => {
  const app = new Hono<{ Variables: { testVar: string } }>()
  it('Should not throw a type error', () => {
    app
      .post(
        '/',
        validator('json', (v) => v),
        async (c) => {
          expectTypeOf(c.get('testVar')).toEqualTypeOf<string>()
          return c.json({ success: true })
        }
      )
      .patch(
        '/',
        validator('json', (v) => v),
        async (c) => {
          expectTypeOf(c.get('testVar')).toEqualTypeOf<string>()
          return c.json({ success: true })
        }
      )
  })
})

describe('Env types with `use` middleware - test only types', () => {
  const app = new Hono()

  const mw1 = createMiddleware<{ Variables: { foo1: string } }>(async () => {})
  const mw2 = createMiddleware<{ Variables: { foo2: string } }>(async () => {})

  it('Should not throw a type error', () => {
    app
      .use(mw1)
      .use(mw2)
      .get('/', (c) => {
        expectTypeOf(c.get('foo1')).toEqualTypeOf<string>()
        expectTypeOf(c.get('foo2')).toEqualTypeOf<string>()
        return c.json({ success: true })
      })
    app.use(mw1, mw2).get('/', (c) => {
      expectTypeOf(c.get('foo1')).toEqualTypeOf<string>()
      expectTypeOf(c.get('foo2')).toEqualTypeOf<string>()
      return c.json({ success: true })
    })
  })
})
