import { compose } from './compose'
import { Context } from './context'
import type { Env } from './context'
import type { Result, Router } from './router'
import { METHOD_NAME_ALL } from './router'
import { METHOD_NAME_ALL_LOWERCASE } from './router'
import { TrieRouter } from './router/trie-router' // Default Router
import { getPathFromURL, mergePath } from './utils/url'

declare global {
  interface Request<ParamKeyType extends string = string> {
    param: {
      (key: ParamKeyType): string
      (): Record<ParamKeyType, string>
    }
    query: {
      (key: string): string
      (): Record<string, string>
    }
    queries: {
      (key: string): string[]
      (): Record<string, string[]>
    }
    header: {
      (name: string): string
      (): Record<string, string>
    }
  }
  interface Response {
    finalized: boolean
  }
}

export type Handler<RequestParamKeyType extends string = string, E = Env> = (
  c: Context<RequestParamKeyType, E>,
  next: Next
) => Response | Promise<Response> | void | Promise<void>
export type NotFoundHandler<E = Env> = (c: Context<string, E>) => Response
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

interface HandlerInterface<T extends string, E = Env, U = Hono<E, T>> {
  // app.get('/', handler, handler...)
  <Path extends string>(
    path: Path,
    ...handlers: Handler<ParamKeys<Path> extends never ? string : ParamKeys<Path>, E>[]
  ): U
  (path: string, ...handlers: Handler<string, E>[]): U
  // app.get(handler...)
  <Path extends string>(
    ...handlers: Handler<ParamKeys<Path> extends never ? string : ParamKeys<Path>, E>[]
  ): U
  (...handlers: Handler<string, E>[]): U
}

const methods = ['get', 'post', 'put', 'delete', 'head', 'options', 'patch'] as const
type Methods = typeof methods[number] | typeof METHOD_NAME_ALL_LOWERCASE

function defineDynamicClass(): {
  new <E extends Env, T extends string, U>(): {
    [K in Methods]: HandlerInterface<T, E, U>
  }
} {
  return class {} as any
}

interface Route<E extends Env> {
  path: string
  method: string
  handler: Handler<string, E>
}

export class Hono<E = Env, P extends string = '/'> extends defineDynamicClass()<E, P, Hono<E, P>> {
  readonly routerClass: { new (): Router<any> } = TrieRouter
  readonly strict: boolean = true // strict routing - default is true
  private _router: Router<Handler<string, E>>
  private _tempPath: string
  private path: string = '/'

  private _cacheResponse: Response

  routes: Route<E>[] = []

  constructor(init: Partial<Pick<Hono, 'routerClass' | 'strict'>> = {}) {
    super()

    const allMethods = [...methods, METHOD_NAME_ALL_LOWERCASE]
    allMethods.map((method) => {
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

    this._router = new this.routerClass()
    this._tempPath = null

    this._cacheResponse = new Response(null, { status: 404 })
    this._cacheResponse.finalized = false
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

  route(path: string, app?: Hono<any>): Hono<E, P> {
    this._tempPath = path
    if (app) {
      app.routes.map((r) => {
        this.addRoute(r.method, r.path, r.handler)
      })
      this._tempPath = null
    }

    return this
  }

  use(path: string, ...middleware: Handler<string, E>[]): Hono<E, P>
  use(...middleware: Handler<string, E>[]): Hono<E, P>
  use(arg1: string | Handler<string, E>, ...handlers: Handler<string, E>[]): Hono<E, P> {
    if (typeof arg1 === 'string') {
      this.path = arg1
    } else {
      handlers.unshift(arg1)
    }
    handlers.map((handler) => {
      this.addRoute(METHOD_NAME_ALL, this.path, handler)
    })
    return this
  }

  onError(handler: ErrorHandler<E>): Hono<E, P> {
    this.errorHandler = handler as ErrorHandler
    return this
  }

  notFound(handler: NotFoundHandler<E>): Hono<E, P> {
    this.notFoundHandler = handler as NotFoundHandler
    return this
  }

  private addRoute(method: string, path: string, handler: Handler<string, E>): void {
    method = method.toUpperCase()
    if (this._tempPath) {
      path = mergePath(this._tempPath, path)
    }
    this._router.add(method, path, handler)
    const r: Route<E> = { path: path, method: method, handler: handler }
    this.routes.push(r)
  }

  private async matchRoute(method: string, path: string): Promise<Result<Handler<string, E>>> {
    return this._router.match(method, path)
  }

  private async dispatch(request: Request, event?: FetchEvent, env?: E): Promise<Response> {
    const path = getPathFromURL(request.url, { strict: this.strict })
    const method = request.method

    const result = await this.matchRoute(method, path)
    request.param = ((key?: string): string | Record<string, string> => {
      if (result) {
        if (key) {
          return result.params[key]
        } else {
          return result.params
        }
      }
    }) as typeof request.param
    const handlers = result ? result.handlers : [this.notFoundHandler]

    const c = new Context<string, E>(request, {
      env: env,
      event: event,
      res: this._cacheResponse,
    })
    c.notFound = () => this.notFoundHandler(c)

    const composed = compose<Context>(handlers, this.errorHandler, this.notFoundHandler)
    let context: Context
    try {
      context = await composed(c)
    } catch (err) {
      if (err instanceof Error) {
        return this.errorHandler(err, c)
      }
    }

    if (!context.res) return context.notFound()

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
