import { compose } from './compose'
import { Context } from './context'
import type { ExecutionContext } from './context'
import type { Router } from './router'
import { METHOD_NAME_ALL, METHOD_NAME_ALL_LOWERCASE, METHODS } from './router'
import { RegExpRouter } from './router/reg-exp-router'
import { SmartRouter } from './router/smart-router'
import { StaticRouter } from './router/static-router'
import { TrieRouter } from './router/trie-router'
import type { ExtractData, HandlerInterface, ToAppType, TypeResponse } from './types'
import type { Handler, Environment, ErrorHandler, NotFoundHandler } from './types'
import { getPathFromURL, mergePath } from './utils/url'

type Methods = typeof METHODS[number] | typeof METHOD_NAME_ALL_LOWERCASE

interface Route {
  path: string
  method: string
  handler: Handler
}

function defineDynamicClass(): {
  new <
    E extends Partial<Environment> = Environment,
    P extends string = string,
    S = unknown,
    T = unknown,
    U = Hono<E, P, S, T>
  >(): {
    [M in Methods]: HandlerInterface<E, P, M, S, T, U>
  }
} {
  return class {} as never
}

export class Hono<
  E extends Partial<Environment> = Environment,
  P extends string = string,
  S = unknown,
  T = unknown
> extends defineDynamicClass()<E, P, S, T, Hono<E, P, S, T>> {
  readonly router: Router<Handler> = new SmartRouter({
    routers: [new StaticRouter(), new RegExpRouter(), new TrieRouter()],
  })
  readonly strict: boolean = true // strict routing - default is true
  private _tempPath: string = ''
  private path: string = '/'

  routes: Route[] = []

  constructor(init: Partial<Pick<Hono, 'router' | 'strict'>> = {}) {
    super()

    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE]
    allMethods.map((method) => {
      this[method] = (args1: string | Handler, ...args: Handler[]) => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this as Hono<E, any, any, any>
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
        this.addRoute(r.method, r.path, r.handler)
      })
      this._tempPath = ''
    }
    return this
  }

  use<Path extends string = string>(...middleware: Handler<Path, 'all', E>[]): Hono<E, P, S, T>
  use<Path extends string = string>(
    arg1: string,
    ...middleware: Handler<Path, 'all', E>[]
  ): Hono<E, P, S, T>
  use(arg1: string | Handler<P, 'all', E>, ...handlers: Handler<P, 'all', E>[]) {
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

  on<Method extends string, Path extends string, Data = S, Type = unknown>(
    method: Method,
    path: Path,
    ...handlers: Handler<string, Method, E, Data, Type>[]
  ): Hono<E, Path, Data & S, ExtractData<typeof handlers[-1], Type>>
  on<M extends string, P extends string>(
    method: M,
    path: P,
    ...handlers: Handler<P, M, E, S, T>[]
  ) {
    if (!method) return this
    this.path = path
    handlers.map((handler) => {
      this.addRoute(method.toUpperCase(), this.path, handler)
    })
    return this
  }

  build = (): ToAppType<typeof this> => {
    const app = {} as typeof this
    type AppType = ToAppType<typeof app>
    return {} as AppType
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

  private addRoute(method: string, path: string, handler: Handler) {
    method = method.toUpperCase()
    if (this._tempPath) {
      path = mergePath(this._tempPath, path)
    }
    this.router.add(method, path, handler)
    const r: Route = { path: path, method: method, handler: handler }
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
  ): Response | Promise<Response> {
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
        res = handler(c, async () => {})
        if (!res) {
          return this.notFoundHandler(c)
        }
      } catch (err) {
        return this.handleError(err, c)
      }

      if ('response' in res) {
        res = res.response
      }

      if (res instanceof Response) {
        return res
      }

      return (async () => {
        let awaited: Response | TypeResponse | undefined | void
        try {
          awaited = await res
          if (awaited !== undefined && 'response' in awaited) {
            awaited = awaited['response'] as Response
          }
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
