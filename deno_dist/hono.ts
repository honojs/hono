import { compose } from './compose.ts'
import type { Context } from './context.ts'
import { HonoContext } from './context.ts'
import { extendRequestPrototype } from './request.ts'
import type { Router } from './router.ts'
import { METHODS } from './router.ts'
import { METHOD_NAME_ALL, METHOD_NAME_ALL_LOWERCASE } from './router.ts'
import { RegExpRouter } from './router/reg-exp-router/index.ts'
import { SmartRouter } from './router/smart-router/index.ts'
import { StaticRouter } from './router/static-router/index.ts'
import { TrieRouter } from './router/trie-router/index.ts'
import { getPathFromURL, mergePath } from './utils/url.ts'

export interface ContextVariableMap {}

export type Bindings = Record<string, any> // For Cloudflare Workers
export type Variables = Record<string, any> // For c.set/c.get functions
export type Environment = {
  Bindings: Bindings
  Variables: Variables
}

export type Handler<
  RequestParamKeyType extends string = string,
  E extends Partial<Environment> = Environment
> = (
  c: Context<RequestParamKeyType, E>,
  next: Next
) => Response | Promise<Response> | Promise<void> | Promise<Response | undefined>

export type MiddlewareHandler = <E extends Partial<Environment> = Environment>(
  c: Context<string, E>,
  next: Next
) => Promise<void> | Promise<Response | undefined>

export type NotFoundHandler<E extends Partial<Environment> = Environment> = (
  c: Context<string, E>
) => Response | Promise<Response>

export type ErrorHandler<E extends Partial<Environment> = Environment> = (
  err: Error,
  c: Context<string, E>
) => Response

export type Next = () => Promise<void>

export const defaultNotFoundMessage = '404 Not Found'

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

interface HandlerInterface<
  T extends string = string,
  E extends Partial<Environment> = Environment,
  U = Hono<E, T>
> {
  // app.get(handler...)
  <Path extends string, Env extends Partial<Environment> = E>(
    ...handlers: Handler<ParamKeys<Path> extends never ? string : ParamKeys<Path>, Env>[]
  ): U
  (...handlers: Handler<string, E>[]): U
  // app.get('/', handler, handler...)
  <Path extends string, Env extends Partial<Environment> = E>(
    path: Path,
    ...handlers: Handler<ParamKeys<Path> extends never ? string : ParamKeys<Path>, Env>[]
  ): U
  (path: string, ...handlers: Handler<string, E>[]): U
}

type Methods = typeof METHODS[number] | typeof METHOD_NAME_ALL_LOWERCASE

function defineDynamicClass(): {
  new <E extends Partial<Environment> = Environment, T extends string = string, U = Hono>(): {
    [K in Methods]: HandlerInterface<T, E, U>
  }
} {
  return class {} as any
}

interface Route<E extends Partial<Environment> = Environment> {
  path: string
  method: string
  handler: Handler<string, E>
}

export class Hono<
  E extends Partial<Environment> = Environment,
  P extends string = '/'
> extends defineDynamicClass()<E, P, Hono<E, P>> {
  readonly router: Router<Handler<string, E>> = new SmartRouter({
    routers: [new StaticRouter(), new RegExpRouter(), new TrieRouter()],
  })
  readonly strict: boolean = true // strict routing - default is true
  private _tempPath: string = ''
  private path: string = '/'

  routes: Route<E>[] = []

  constructor(init: Partial<Pick<Hono, 'router' | 'strict'>> = {}) {
    super()

    extendRequestPrototype()

    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE]
    allMethods.map((method) => {
      this[method] = <Path extends string = ''>(
        args1: Path | Handler<ParamKeys<Path>, E>,
        ...args: [Handler<ParamKeys<Path>, E>]
      ): this => {
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

  private notFoundHandler: NotFoundHandler<E> = (c: Context<string, E>) => {
    const message = defaultNotFoundMessage
    return c.text(message, 404)
  }

  private errorHandler: ErrorHandler<E> = (err: Error, c: Context<string, E>) => {
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

  use<Path extends string = string, Env extends Partial<Environment> = E>(
    ...middleware: Handler<Path, Env>[]
  ): Hono<Env, Path>
  use<Path extends string = string, Env extends Partial<Environment> = E>(
    arg1: string,
    ...middleware: Handler<Path, Env>[]
  ): Hono<Env, Path>
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
    this.errorHandler = handler
    return this
  }

  notFound(handler: NotFoundHandler<E>): Hono<E, P> {
    this.notFoundHandler = handler
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
    env?: E['Bindings']
  ): Promise<Response> {
    const path = getPathFromURL(request.url, this.strict)
    const method = request.method

    const result = this.matchRoute(method, path)
    request.paramData = result?.params

    const c = new HonoContext<string, E>(request, env, eventOrExecutionCtx, this.notFoundHandler)

    // Do not `compose` if it has only one handler
    if (result && result.handlers.length === 1) {
      const handler = result.handlers[0]
      try {
        const res = handler(c, async () => {})
        if (res) {
          const awaited = res instanceof Promise ? await res : res
          if (awaited) return awaited
        }
        return this.notFoundHandler(c)
      } catch (err) {
        if (err instanceof Error) {
          return this.errorHandler(err, c)
        }
        throw err
      }
    }

    const handlers = result ? result.handlers : [this.notFoundHandler]

    const composed = compose<HonoContext<string, E>, E>(handlers, this.notFoundHandler)
    let context: HonoContext<string, E>
    try {
      const tmp = composed(c)
      context = tmp instanceof Promise ? await tmp : tmp
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

  handleEvent(event: FetchEvent): Promise<Response> {
    return this.dispatch(event.request, event)
  }

  fetch = (request: Request, Environment?: E['Bindings'], executionCtx?: ExecutionContext) => {
    return this.dispatch(request, executionCtx, Environment)
  }

  request(input: RequestInfo, requestInit?: RequestInit): Promise<Response> {
    const req = input instanceof Request ? input : new Request(input, requestInit)
    return this.dispatch(req)
  }
}
