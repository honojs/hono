import { compose } from './compose'
import { Context } from './context'
import { extendRequestPrototype } from './request'
import type { Router } from './router'
import { METHOD_NAME_ALL, METHOD_NAME_ALL_LOWERCASE } from './router'
import { TrieRouter } from './router/trie-router' // Default Router
import { getPathFromURL, mergePath } from './utils/url'

type Env = Record<string, any>
export type Handler<RequestParamKeyType extends string = string, E = Env> = (
  c: Context<RequestParamKeyType, E>,
  next: Next
) => Response | Promise<Response> | Promise<void> | Promise<Response | undefined>
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

interface HandlerInterface<T extends string, E extends Env = Env, U = Hono<E, T>> {
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

export class Hono<E extends Env = Env, P extends string = '/'> extends defineDynamicClass()<
  E,
  P,
  Hono<E, P>
> {
  readonly router: Router<Handler<string, E>> = new TrieRouter()
  readonly strict: boolean = true // strict routing - default is true
  private _tempPath: string = ''
  private path: string = '/'

  routes: Route<E>[] = []

  constructor(init: Partial<Pick<Hono, 'router' | 'strict'>> = {}) {
    super()

    extendRequestPrototype()

    const allMethods = [...methods, METHOD_NAME_ALL_LOWERCASE]
    allMethods.map((method) => {
      this[method] = <Path extends string = ''>(
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
      this._tempPath = ''
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
    this.router.add(method, path, handler)
    const r: Route<E> = { path: path, method: method, handler: handler }
    this.routes.push(r)
  }

  private matchRoute(method: string, path: string) {
    return this.router.match(method, path)
  }

  private async dispatch(
    request: Request,
    eventOrExecutionCtx?: ExecutionContext | FetchEvent,
    env?: E
  ): Promise<Response> {
    const path = getPathFromURL(request.url, this.strict)
    const method = request.method

    const result = this.matchRoute(method, path)
    request.paramData = result?.params

    const handlers = result ? result.handlers : [this.notFoundHandler]

    const c = new Context<string, E>(request, env, eventOrExecutionCtx, this.notFoundHandler)

    const composed = compose<Context>(handlers, this.errorHandler, this.notFoundHandler)
    let context: Context
    try {
      context = await composed(c)
      if (!context.finalized) {
        throw new Error(
          'Context is not finalized. You may forget returning Response object or `await next()`'
        )
      }
    } catch (err) {
      if (err instanceof Error) {
        return this.errorHandler(err, c)
      }
      throw err
    }

    return context.res
  }

  async handleEvent(event: FetchEvent): Promise<Response> {
    return this.dispatch(event.request, event)
  }

  fetch = async (request: Request, env?: E, executionCtx?: ExecutionContext) => {
    return this.dispatch(request, executionCtx, env)
  }

  request(input: RequestInfo, requestInit?: RequestInit): Promise<Response> {
    const req = input instanceof Request ? input : new Request(input, requestInit)
    return this.dispatch(req)
  }
}
