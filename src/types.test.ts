/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Context } from './context'
import { Hono } from './hono'
import { poweredBy } from './middleware/powered-by'
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
  Schema,
  UndefinedIfHavingQuestion,
} from './types'
import type { Expect, Equal } from './utils/types'

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
      type verify = Expect<Equal<string, typeof foo>>
      const FLAG = c.env.FLAG
      type verify2 = Expect<Equal<boolean, typeof FLAG>>
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
      never,
      {
        input: { json: Payload }
        output: { json: Payload }
      }
    > = async (_c, next) => {
      await next()
    }
    test('Context', () => {
      const route = app.get(middleware, (c) => {
        type Expected = Context<
          Env,
          never,
          {
            input: { json: Payload }
            output: { json: Payload }
          }
        >
        type verify = Expect<Equal<Expected, typeof c>>
        return c.jsonT({
          message: 'Hello!',
        })
      })
      app.get(middleware, (c) => {
        const data = c.req.valid('json')
        type verify = Expect<Equal<Payload, typeof data>>
        return c.jsonT({
          message: 'Hello!',
        })
      })
    })
  })

  describe('path pattern', () => {
    const app = new Hono<Env>()
    const middleware: MiddlewareHandler<
      Env,
      '/foo',
      { input: { json: Payload }; output: { json: Payload } }
    > = async (_c, next) => {
      await next()
    }
    test('Context and AppType', () => {
      const route = app.get('/foo', middleware, (c) => {
        type Expected = Context<
          Env,
          '/foo',
          { input: { json: Payload }; output: { json: Payload } }
        >
        type verify = Expect<Equal<Expected, typeof c>>
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
})

describe('OnHandlerInterface', () => {
  const app = new Hono()
  test('Context', () => {
    const middleware: MiddlewareHandler<
      Env,
      '/purge',
      { input: { form: { id: string } }; output: { form: { id: number } } }
    > = async (_c, next) => {
      await next()
    }
    const route = app.on('PURGE', '/purge', middleware, (c) => {
      const data = c.req.valid('form')
      type verify = Expect<Equal<{ id: number }, typeof data>>
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
            success: true
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
      Schema<
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
      type verifyEnv = Expect<Equal<number, typeof foo>>
      const id = c.req.param('id')
      type verifyPath = Expect<Equal<string, typeof id>>
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
      type verifyEnv = Expect<Equal<number, typeof foo>>
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
    const handler: Handler<E, '/', { input: { json: User }; output: { json: User } }> = (c) => {
      const foo = c.get('foo')
      type verifyEnv = Expect<Equal<number, typeof foo>>
      const { name } = c.req.valid('json')
      type verifySchema = Expect<Equal<string, typeof name>>
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
  })

  test('MergeSchemaPath', () => {
    type Sub = Schema<
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
      Schema<
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
})
