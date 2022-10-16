import { compose } from './compose'
import type { Context } from './context'
import { HonoContext } from './context'
import { Exception } from './exceptions/Exception'
import { extendRequestPrototype } from './request'
import type { Router } from './router'
import { METHODS } from './router'
import { METHOD_NAME_ALL, METHOD_NAME_ALL_LOWERCASE } from './router'
import { RegExpRouter } from './router/reg-exp-router'
import { SmartRouter } from './router/smart-router'
import { StaticRouter } from './router/static-router'
import { TrieRouter } from './router/trie-router'
import { getPathFromURL, mergePath } from './utils/url'

export interface ContextVariableMap {}

export type Bindings = Record<string, any> // For Cloudflare Workers
export type Variables = Record<string, any> // For c.set/c.get functions
export type Environment = {
  Bindings: Bindings
  Variables: Variables
}

export type ValidatedData = Record<string, any> // For validated data

export type Handler<
  RequestParamKeyType extends string = string,
  E extends Partial<Environment> = Environment,
  D extends ValidatedData = ValidatedData
> = (
  c: Context<RequestParamKeyType, E, D>,
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

interface HandlerInterface<T extends string, E extends Partial<Environment>, U = Hono<E, T>> {
  // app.get(handler...)
  <Path extends string, Data extends ValidatedData>(
    ...handlers: Handler<ParamKeys<Path> extends never ? string : ParamKeys<Path>, E, Data>[]
  ): U
  (...handlers: Handler<string, E>[]): U
  // app.get('/', handler, handler...)
  <Path extends string, Data extends ValidatedData>(
    path: Path,
    ...handlers: Handler<ParamKeys<Path> extends never ? string : ParamKeys<Path>, E, Data>[]
  ): U
  (path: string, ...handlers: Handler<string, E>[]): U
}

type Methods = typeof METHODS[number] | typeof METHOD_NAME_ALL_LOWERCASE

function defineDynamicClass(): {
  new <E extends Partial<Environment> = Environment, T extends string = string, U = Hono<E, T>>(): {
    [K in Methods]: HandlerInterface<T, E, U>
  }
} {
  return class {} as any
}

interface Route<
  E extends Partial<Environment> = Environment,
  D extends ValidatedData = ValidatedData
> {
  path: string
  method: string
  handler: Handler<string, E, D>
}

export class Hono<
  E extends Partial<Environment> = Environment,
  P extends string = '/',
  D extends ValidatedData = ValidatedData
> extends defineDynamicClass()<E, P, Hono<E, P, D>> {
  readonly router: Router<Handler<string, E, D>> = new SmartRouter({
    routers: [new StaticRouter(), new RegExpRouter(), new TrieRouter()],
  })
  readonly strict: boolean = true // strict routing - default is true
  private _tempPath: string = ''
  private path: string = '/'

  routes: Route<E, D>[] = []

  constructor(init: Partial<Pick<Hono, 'router' | 'strict'>> = {}) {
    super()

    extendRequestPrototype()

    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE]
    allMethods.map((method) => {
      this[method] = <Path extends string = ''>(
        args1: Path | Handler<ParamKeys<Path>, E, D>,
        ...args: [Handler<ParamKeys<Path>, E, D>]
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
    return c.text('404 Not Found', 404)
  }

  private errorHandler: ErrorHandler<E> = (err: Error, c: Context<string, E>) => {
    if (err instanceof Exception) {
      c.status(err.status)
      return c.text(err.message)
    }

    console.trace(err.message)
    const message = 'Internal Server Error'
    return c.text(message, 500)
  }

  route(path: string, app?: Hono<any>): Hono<E, P, D> {
    this._tempPath = path
    if (app) {
      app.routes.map((r) => {
        this.addRoute(r.method, r.path, r.handler)
      })
      this._tempPath = ''
    }

    return this
  }

  use<Path extends string = string, Data extends ValidatedData = D>(
    ...middleware: Handler<Path, E, Data>[]
  ): Hono<E, Path, Data>
  use<Path extends string = string, Data extends ValidatedData = D>(
    arg1: string,
    ...middleware: Handler<Path, E, Data>[]
  ): Hono<E, Path, D>
  use(arg1: string | Handler<string, E, D>, ...handlers: Handler<string, E, D>[]): Hono<E, P, D> {
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

  onError(handler: ErrorHandler<E>): Hono<E, P, D> {
    this.errorHandler = handler
    return this
  }

  notFound(handler: NotFoundHandler<E>): Hono<E, P, D> {
    this.notFoundHandler = handler
    return this
  }

  private addRoute(method: string, path: string, handler: Handler<string, E, D>): void {
    method = method.toUpperCase()
    if (this._tempPath) {
      path = mergePath(this._tempPath, path)
    }
    this.router.add(method, path, handler)
    const r: Route<E, D> = { path: path, method: method, handler: handler }
    this.routes.push(r)
  }

  private matchRoute(method: string, path: string) {
    return this.router.match(method, path)
  }

  private handleError(err: unknown, c: Context) {
    if (err instanceof Error) {
      return this.errorHandler(err, c)
    }
    throw err
  }

  private dispatch(
    request: Request,
    eventOrExecutionCtx?: ExecutionContext | FetchEvent,
    env?: E['Bindings']
  ) {
    const path = getPathFromURL(request.url, this.strict)
    const method = request.method

    const result = this.matchRoute(method, path)
    request.paramData = result?.params

    const c = new HonoContext<string, E, D>(request, env, eventOrExecutionCtx, this.notFoundHandler)

    // Do not `compose` if it has only one handler
    if (result && result.handlers.length === 1) {
      const handler = result.handlers[0]
      let res: ReturnType<Handler>

      try {
        res = handler(c, async () => {})
        if (!res) return this.notFoundHandler(c)
      } catch (err) {
        return this.handleError(err, c)
      }

      if (res instanceof Response) return res

      return (async () => {
        let awaited: Response | undefined | void
        try {
          awaited = await res
        } catch (err) {
          return this.handleError(err, c)
        }
        if (!awaited) {
          return this.notFoundHandler(c)
        }
        return awaited
      })()
    }

    const handlers = result ? result.handlers : [this.notFoundHandler]
    const composed = compose<HonoContext<string, E>, E>(
      handlers,
      this.notFoundHandler,
      this.errorHandler
    )

    return (async () => {
      try {
        const tmp = composed(c)
        const context = tmp instanceof Promise ? await tmp : tmp
        if (!context.finalized) {
          throw new Error(
            'Context is not finalized. You may forget returning Response object or `await next()`'
          )
        }
        return context.res
      } catch (err) {
        return this.handleError(err, c)
      }
    })()
  }

  handleEvent = (event: FetchEvent) => {
    return this.dispatch(event.request, event)
  }

  fetch = (request: Request, Environment?: E['Bindings'], executionCtx?: ExecutionContext) => {
    return this.dispatch(request, executionCtx, Environment)
  }

  request = async (input: RequestInfo, requestInit?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, requestInit)
    return await this.fetch(req)
  }
}
