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

export type Handler<RequestParamKeyType = string> = (
  c: Context<RequestParamKeyType>,
  next?: Next
) => Response | Promise<Response>
export type MiddlewareHandler = (c: Context, next: Next) => Promise<void>
export type NotFoundHandler = (c: Context) => Response | Promise<Response>
export type ErrorHandler = (err: Error, c: Context) => Response
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

interface HandlerInterface<T extends string> {
  <Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono<Path>
  <Path extends T>(handler: Handler<ParamKeys<T>>): Hono<Path>
}

const methods = ['get', 'post', 'put', 'delete', 'head', 'options', 'patch', 'all'] as const
type Methods = typeof methods[number]

function defineDynamicClass(): {
  new <T extends string>(): {
    [K in Methods]: HandlerInterface<T>
  }
} {
  return class {} as any
}

export class Hono<P extends string> extends defineDynamicClass()<P> {
  readonly routerClass: { new (): Router<any> } = TrieRouter
  readonly strict: boolean = true // strict routing - default is true
  #router: Router<Handler>
  #middlewareRouters: Router<MiddlewareHandler>[]
  #tempPath: string
  private path: string

  constructor(init: Partial<Pick<Hono<P>, 'routerClass' | 'strict'>> = {}) {
    super()
    methods.map((method) => {
      this[method] = <Path extends string>(
        arg1: Path | Handler<ParamKeys<P>>,
        arg2?: Handler<ParamKeys<Path>>
      ) => {
        if (typeof arg1 === 'string') {
          this.path = arg1
          return this.addRoute(method, this.path, arg2)
        }
        return this.addRoute(method, this.path, arg1)
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

  route(path: string): Hono<P> {
    const newHono: Hono<P> = new Hono()
    newHono.#tempPath = path
    newHono.#router = this.#router
    return newHono
  }

  use(path: string, middleware: MiddlewareHandler): Hono<P>
  use(middleware: MiddlewareHandler): Hono<P>
  use(arg1: string | MiddlewareHandler, arg2?: MiddlewareHandler): Hono<P> {
    let handler: MiddlewareHandler
    if (typeof arg1 === 'string') {
      this.path = arg1
      handler = arg2
    } else {
      handler = arg1
    }
    if (handler.constructor.name !== 'AsyncFunction') {
      throw new TypeError('middleware must be a async function!')
    }
    const router = new this.routerClass()
    router.add(METHOD_NAME_OF_ALL, this.path, handler)
    this.#middlewareRouters.push(router)
    return this
  }

  onError(handler: ErrorHandler): Hono<P> {
    this.errorHandler = handler
    return this
  }

  notFound(handler: NotFoundHandler): Hono<P> {
    this.notFoundHandler = handler
    return this
  }

  private addRoute(method: string, path: string, handler: Handler): Hono<P> {
    method = method.toUpperCase()
    if (this.#tempPath) {
      path = mergePath(this.#tempPath, path)
    }
    this.#router.add(method, path, handler)
    return this
  }

  private async matchRoute(method: string, path: string): Promise<Result<Handler>> {
    return this.#router.match(method, path)
  }

  private async dispatch(request: Request, env?: Env, event?: FetchEvent): Promise<Response> {
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
      const mwResult = mr.match(METHOD_NAME_OF_ALL, path)
      if (mwResult) middleware.push(mwResult.handler)
    }

    const wrappedHandler = async (context: Context, next: Next) => {
      const res = await handler(context)
      if (!(res instanceof Response)) {
        throw new TypeError('response must be a instance of Response')
      }
      context.res = res
      await next()
    }

    middleware.push(wrappedHandler)

    const composed = compose<Context>(middleware, this.errorHandler)
    const c = new Context(request, { env: env, event: event, res: null })
    c.notFound = () => this.notFoundHandler(c)

    const context = await composed(c)

    return context.res
  }

  async handleEvent(event: FetchEvent): Promise<Response> {
    return this.dispatch(event.request, {}, event)
  }

  async fetch(request: Request, env?: Env, event?: FetchEvent): Promise<Response> {
    return this.dispatch(request, env, event)
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
