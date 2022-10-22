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
import type { Schema } from './validator/schema.ts'

export interface ContextVariableMap {}

export type Bindings = Record<string, any> // For Cloudflare Workers
export type Variables = Record<string, any> // For c.set/c.get functions
export type Environment = {
  Bindings: Bindings
  Variables: Variables
}

export type Handler<
  P extends string = string,
  E extends Partial<Environment> = Environment,
  S extends Partial<Schema> = Schema
> = (c: Context<P, E, S>, next: Next) => Response | Promise<Response | undefined | void>

export type MiddlewareHandler<
  P extends string = string,
  E extends Partial<Environment> = Environment,
  S extends Partial<Schema> = Schema
> = (c: Context<P, E, S>, next: Next) => Promise<Response | undefined | void>

export type NotFoundHandler<
  P extends string = string,
  E extends Partial<Environment> = Environment,
  S extends Partial<Schema> = Schema
> = (c: Context<P, E, S>) => Response | Promise<Response>

export type ErrorHandler<
  P extends string = string,
  E extends Partial<Environment> = Environment,
  S extends Partial<Schema> = Schema
> = (err: Error, c: Context<P, E, S>) => Response

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

interface HandlerInterface<
  P extends string,
  E extends Partial<Environment>,
  S extends Partial<Schema>,
  U = Hono<E, P, S>
> {
  // app.get(handler...)
  <Path extends string, Data extends Schema>(
    ...handlers: Handler<ParamKeys<Path> extends never ? string : ParamKeys<Path>, E, Data>[]
  ): U
  (...handlers: Handler<string, E, S>[]): U

  // app.get('/', handler, handler...)
  <Path extends string, Data extends Partial<Schema> = Schema>(
    path: Path,
    ...handlers: Handler<ParamKeys<Path> extends never ? string : ParamKeys<Path>, E, Data>[]
  ): U
  <Path extends string, Data extends Schema>(path: Path, ...handlers: Handler<string, E, Data>[]): U
  (path: string, ...handlers: Handler<string, E, S>[]): U
}

type Methods = typeof METHODS[number] | typeof METHOD_NAME_ALL_LOWERCASE

function defineDynamicClass(): {
  new <
    E extends Partial<Environment> = Environment,
    P extends string = string,
    S extends Partial<Schema> = Schema,
    U = Hono<E, P, S>
  >(): {
    [K in Methods]: HandlerInterface<P, E, S, U>
  }
} {
  return class {} as never
}

interface Route<
  P extends string = string,
  E extends Partial<Environment> = Environment,
  S extends Partial<Schema> = Schema
> {
  path: string
  method: string
  handler: Handler<P, E, S>
}

export class Hono<
  E extends Partial<Environment> = Environment,
  P extends string = '/',
  S extends Partial<Schema> = Schema
> extends defineDynamicClass()<E, P, S, Hono<E, P, S>> {
  readonly router: Router<Handler<P, E, S>> = new SmartRouter({
    routers: [new StaticRouter(), new RegExpRouter(), new TrieRouter()],
  })
  readonly strict: boolean = true // strict routing - default is true
  private _tempPath: string = ''
  private path: string = '/'

  routes: Route<P, E, S>[] = []

  constructor(init: Partial<Pick<Hono, 'router' | 'strict'>> = {}) {
    super()

    extendRequestPrototype()

    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE]
    allMethods.map((method) => {
      this[method] = <Path extends string, Env extends Environment, Data extends Schema>(
        args1: Path | Handler<ParamKeys<Path>, Env, Data>,
        ...args: [Handler<ParamKeys<Path>, Env, Data>]
      ): this => {
        if (typeof args1 === 'string') {
          this.path = args1
        } else {
          this.addRoute(method, this.path, args1 as unknown as Handler<P, E, S>)
        }
        args.map((handler) => {
          if (typeof handler !== 'string') {
            this.addRoute(method, this.path, handler as unknown as Handler<P, E, S>)
          }
        })
        return this
      }
    })

    Object.assign(this, init)
  }

  private notFoundHandler: NotFoundHandler<P, E, S> = (c: Context<P, E, S>) => {
    return c.text('404 Not Found', 404)
  }

  private errorHandler: ErrorHandler<P, E, S> = (err: Error, c: Context<P, E, S>) => {
    console.trace(err.message)
    const message = 'Internal Server Error'
    return c.text(message, 500)
  }

  route(path: string, app?: Hono<E, P, S>) {
    this._tempPath = path
    if (app) {
      app.routes.map((r) => {
        this.addRoute(r.method, r.path, r.handler)
      })
      this._tempPath = ''
    }
    return this
  }

  use<Path extends string = string, Data extends Partial<Schema> = Schema>(
    ...middleware: Handler<Path, E, Data>[]
  ): Hono<E, Path, S>
  use<Path extends string = string, Data extends Partial<Schema> = Schema>(
    arg1: string,
    ...middleware: Handler<Path, E, Data>[]
  ): Hono<E, Path, S>
  use(arg1: string | Handler<P, E, S>, ...handlers: Handler<P, E, S>[]) {
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

  onError(handler: ErrorHandler<P, E, S>) {
    this.errorHandler = handler
    return this
  }

  notFound(handler: NotFoundHandler<P, E, S>) {
    this.notFoundHandler = handler
    return this
  }

  private addRoute(method: string, path: string, handler: Handler<P, E, S>): void {
    method = method.toUpperCase()
    if (this._tempPath) {
      path = mergePath(this._tempPath, path)
    }
    this.router.add(method, path, handler)
    const r: Route<P, E, S> = { path: path, method: method, handler: handler }
    this.routes.push(r)
  }

  private matchRoute(method: string, path: string) {
    return this.router.match(method, path)
  }

  private handleError(err: unknown, c: Context<P, E, S>) {
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

    const c = new HonoContext<P, E, S>(request, env, eventOrExecutionCtx, this.notFoundHandler)

    // Do not `compose` if it has only one handler
    if (result && result.handlers.length === 1) {
      const handler = result.handlers[0]
      let res: ReturnType<Handler<P>>

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
    const composed = compose<HonoContext<P, E, S>, P, E, S>(
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
