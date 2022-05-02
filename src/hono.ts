import { compose } from '@/compose'
import { Context } from '@/context'
import type { Env } from '@/context'
import { METHOD_NAME_OF_ALL } from '@/router'
import type { Result, Router } from '@/router'
import { TrieRouter } from '@/router/trie-router' // Default Router
import { getPathFromURL, mergePath } from '@/utils/url'

declare global {
  interface Request<ParamKeyType = string> {
    param: (key: ParamKeyType) => string
    query: (key: string) => string
    header: (name: string) => string
  }
}

export type Handler<RequestParamKeyType = string, E = Env> = (
  c: Context<RequestParamKeyType, E>,
  next?: Next
) => Response | Promise<Response> | void | Promise<void>
export type NotFoundHandler<E = Env> = (c: Context<string, E>) => Response | Promise<Response>
export type ErrorHandler<E = Env> = (err: Error, c: Context<string, E>) => Response
export type Next = () => Promise<void>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ParamKeyName<NameWithPattern> = NameWithPattern extends `${infer Name}{${infer _Pattern}`
  ? Name
  : NameWithPattern

type ParamKey<Component> = Component extends `:${infer NameWithPattern}`
  ? ParamKeyName<NameWithPattern>
  : never

type ParamKeys<Path> = Path extends `${infer Component}/${infer Rest}`
  ? ParamKey<Component> | ParamKeys<Rest>
  : ParamKey<Path>

interface HandlerInterface<T extends string, E = Env> {
  // app.get('/', handler, handler...)
  <Path extends string>(path: Path, ...handlers: Handler<ParamKeys<Path>, E>[]): Hono<E, Path>
  (path: string, ...handlers: Handler<string, E>[]): Hono<E, T>
  // app.get(handler...)
  <Path extends T>(...handlers: Handler<ParamKeys<T>, E>[]): Hono<E, Path>
  (...handlers: Handler<string, E>[]): Hono<E, T>
}

const methods = ['get', 'post', 'put', 'delete', 'head', 'options', 'patch', 'all'] as const
type Methods = typeof methods[number]

function defineDynamicClass(): {
  new <E extends Env, T extends string>(): {
    [K in Methods]: HandlerInterface<T, E>
  }
} {
  return class {} as any
}

export class Hono<E = Env, P extends string = ''> extends defineDynamicClass()<E, P> {
  readonly routerClass: { new (): Router<any> } = TrieRouter
  readonly strict: boolean = true // strict routing - default is true
  #router: Router<Handler<string, E>>
  #middlewareRouters: Router<Handler>[]
  #tempPath: string
  private path: string

  constructor(init: Partial<Pick<Hono, 'routerClass' | 'strict'>> = {}) {
    super()

    methods.map((method) => {
      this[method] = <Path extends string>(
        args1: Path | Handler<ParamKeys<Path>, E>,
        ...args: [Handler<ParamKeys<Path>, E>]
      ) => {
        if (typeof args1 === 'string') {
          this.path = args1
        } else {
          this.addRoute(method, this.path, args1)
        }
        args.map((handler) => {
          if (typeof handler !== 'string') {
            this.addRoute(method, this.path, handler)
          }
        })
        return this
      }
    })

    Object.assign(this, init)

    this.#router = new this.routerClass()
    this.#middlewareRouters = []
    this.#tempPath = null
  }

  private notFoundHandler: NotFoundHandler = (c: Context) => {
    const message = '404 Not Found'
    return c.text(message, 404)
  }

  private errorHandler: ErrorHandler = (err: Error, c: Context) => {
    console.error(`${err.stack || err.message}`)
    const message = 'Internal Server Error'
    return c.text(message, 500)
  }

  route(path: string): Hono<E, P> {
    const newHono: Hono<E, P> = new Hono()
    newHono.#tempPath = path
    newHono.#router = this.#router
    return newHono
  }

  use(path: string, middleware: Handler<string, E>): Hono<E, P>
  use(middleware: Handler<string, E>): Hono<E, P>
  use(arg1: string | Handler<string, E>, arg2?: Handler<string, E>): Hono<E, P> {
    let handler: Handler<string, E>
    if (typeof arg1 === 'string') {
      this.path = arg1
      handler = arg2
    } else {
      handler = arg1
    }
    this.addMiddlewareRoute(METHOD_NAME_OF_ALL, this.path, handler)
    return this
  }

  addMiddlewareRoute(method: string, path: string, handler: Handler<string, E>) {
    if (handler.constructor.name !== 'AsyncFunction') {
      throw new TypeError('middleware must be a async function!')
    }
    const router = new this.routerClass()
    router.add(method, path, handler)
    this.#middlewareRouters.push(router)
  }

  onError(handler: ErrorHandler<E>): Hono<E, P> {
    this.errorHandler = handler as ErrorHandler
    return this
  }

  notFound(handler: NotFoundHandler<E>): Hono<E, P> {
    this.notFoundHandler = handler as NotFoundHandler
    return this
  }

  private createFakeContext = (): Context<string, E> => {
    const request = new Request('http://localhost/')
    request.param = () => ''
    const fake = new Context<string, E>(request)
    fake.notFound = () => this.notFoundHandler(fake)
    return fake
  }

  private addRoute(method: string, path: string, handler: Handler<string, E>) {
    method = method.toUpperCase()

    if (this.#tempPath) {
      path = mergePath(this.#tempPath, path)
    }

    let isMiddlewareHandler = false
    const next = async () => {
      isMiddlewareHandler = true
    }

    ;(async () => {
      // Detect if handler is middleware with using Fake Context
      await handler(this.createFakeContext(), next)
    })().catch(() => {
      // Do nothing
    })

    if (isMiddlewareHandler) {
      this.addMiddlewareRoute(method, path, handler)
    } else {
      this.#router.add(method, path, handler)
    }

    return this
  }

  private async matchRoute(method: string, path: string): Promise<Result<Handler<string, E>>> {
    return this.#router.match(method, path)
  }

  private async dispatch(request: Request, event?: FetchEvent, env?: E): Promise<Response> {
    const path = getPathFromURL(request.url, { strict: this.strict })
    const method = request.method

    const result = await this.matchRoute(method, path)

    // Methods for Request object
    request.param = (key: string): string => {
      if (result) return result.params[key]
    }

    const handler = result ? result.handler : this.notFoundHandler

    const middleware = []

    for (const mr of this.#middlewareRouters) {
      const mwResult = mr.match(method, path)
      if (mwResult) middleware.push(mwResult.handler)
    }

    const wrappedHandler = async (context: Context<string, E>, next: Next) => {
      const res = await handler(context)
      if (!(res instanceof Response)) {
        throw new TypeError('response must be a instance of Response')
      }
      context.res = res
      await next()
    }

    middleware.push(wrappedHandler)

    const composed = compose<Context>(middleware, this.errorHandler)
    const c = new Context<string, E>(request, { env: env, event: event, res: null })
    c.notFound = () => this.notFoundHandler(c)

    const context = await composed(c)

    return context.res
  }

  async handleEvent(event: FetchEvent): Promise<Response> {
    return this.dispatch(event.request, event)
  }

  async fetch(request: Request, env?: E, event?: FetchEvent): Promise<Response> {
    return this.dispatch(request, event, env)
  }

  request(input: RequestInfo, requestInit?: RequestInit): Promise<Response> {
    const req = input instanceof Request ? input : new Request(input, requestInit)
    return this.dispatch(req)
  }

  fire(): void {
    addEventListener('fetch', (event: FetchEvent): void => {
      event.respondWith(this.handleEvent(event))
    })
  }
}
