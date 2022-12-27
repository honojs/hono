import { compose } from './compose'
import { Context } from './context'
import type { Router } from './router'
import { METHOD_NAME_ALL, METHOD_NAME_ALL_LOWERCASE, METHODS } from './router'
import { RegExpRouter } from './router/reg-exp-router'
import { SmartRouter } from './router/smart-router'
import { StaticRouter } from './router/static-router'
import { TrieRouter } from './router/trie-router'
import type { ExecutionContext } from './types'
import type { Handler, Environment, ParamKeys, ErrorHandler, NotFoundHandler } from './types'
import { getPathFromURL, mergePath } from './utils/url'

interface HandlerInterface<
  P extends string,
  E extends Partial<Environment> = Environment,
  S = unknown,
  U = Hono<E, P, S>
> {
  // app.get(handler...)
  <Path extends string, Data = S>(
    ...handlers: Handler<ParamKeys<Path> extends never ? string : ParamKeys<Path>, E, Data>[]
  ): Hono<E, Path, Data & S>
  (...handlers: Handler<P, E, S>[]): U

  // app.get('/', handler, handler...)
  <Path extends string, Data = S>(
    path: Path,
    ...handlers: Handler<ParamKeys<Path> extends never ? string : ParamKeys<Path>, E, Data>[]
  ): Hono<E, Path, Data & S>
  <Path extends string, Data = S>(path: Path, ...handlers: Handler<string, E, Data>[]): Hono<
    E,
    string,
    Data & S
  >
  (path: string, ...handlers: Handler<P, E, S>[]): U
}

type Methods = typeof METHODS[number] | typeof METHOD_NAME_ALL_LOWERCASE

function defineDynamicClass(): {
  new <
    E extends Partial<Environment> = Environment,
    P extends string = string,
    S = unknown,
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
  S = unknown
> {
  path: string
  method: string
  handler: Handler<P, E, S>
}

export class Hono<
  E extends Partial<Environment> = Environment,
  P extends string = string,
  S = unknown
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

    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE]
    allMethods.map((method) => {
      this[method] = <Env extends Environment, Data>(
        args1: string | Handler<string, Env, Data>,
        ...args: Handler<string, Env, Data>[]
      ) => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this as unknown as Hono<E, any, any>
      }
    })

    Object.assign(this, init)
  }

  private notFoundHandler: NotFoundHandler<E> = (c: Context<string, E>) => {
    return c.text('404 Not Found', 404)
  }

  private errorHandler: ErrorHandler<E> = (err: Error, c: Context<string, E>) => {
    console.trace(err)
    const message = 'Internal Server Error'
    return c.text(message, 500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  route(path: string, app?: Hono<any>) {
    this._tempPath = path
    if (app) {
      app.routes.map((r) => {
        this.addRoute(r.method, r.path, r.handler as unknown as Handler<P, E, S>)
      })
      this._tempPath = ''
    }
    return this
  }

  use<Path extends string = string, Data = unknown>(
    ...middleware: Handler<Path, E, Data>[]
  ): Hono<E, P, S>
  use<Path extends string = string, Data = unknown>(
    arg1: string,
    ...middleware: Handler<Path, E, Data>[]
  ): Hono<E, P, S>
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

  on(method: string, path: string, ...handlers: Handler<P, E, S>[]) {
    if (!method) return this
    this.path = path
    handlers.map((handler) => {
      this.addRoute(method.toUpperCase(), this.path, handler)
    })
    return this
  }

  onError(handler: ErrorHandler<E>) {
    this.errorHandler = handler
    return this
  }

  notFound(handler: NotFoundHandler<E>) {
    this.notFoundHandler = handler
    return this
  }

  showRoutes() {
    const length = 8
    this.routes.map((route) => {
      console.log(
        `\x1b[32m${route.method}\x1b[0m ${' '.repeat(length - route.method.length)} ${route.path}`
      )
    })
  }

  private addRoute(method: string, path: string, handler: Handler<P, E, S>) {
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

  private handleError(err: unknown, c: Context<string, E>) {
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
    const paramData = result?.params

    const c = new Context<string, E>(request, {
      env,
      executionCtx: eventOrExecutionCtx,
      notFoundHandler: this.notFoundHandler,
      paramData,
    })

    // Do not `compose` if it has only one handler
    if (result && result.handlers.length === 1) {
      const handler = result.handlers[0]
      let res: ReturnType<Handler<P>>

      try {
        res = handler(c as unknown as Context<string, E, S>, async () => {})
        if (!res) return this.notFoundHandler(c)
      } catch (err) {
        return this.handleError(err, c)
      }

      if (res instanceof Response) return res

      return (async () => {
        let awaited: Response | undefined | void
        try {
          awaited = await res
          if (!awaited) {
            return this.notFoundHandler(c)
          }
        } catch (err) {
          return this.handleError(err, c)
        }
        return awaited
      })()
    }

    const handlers = result ? result.handlers : [this.notFoundHandler]
    const composed = compose<Context<P, E>, E>(handlers, this.notFoundHandler, this.errorHandler)

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

  request = async (input: Request | string, requestInit?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, requestInit)
    return await this.fetch(req)
  }
}
