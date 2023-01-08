import { compose } from './compose'
import { Context } from './context'
import type { ExecutionContext } from './context'
import type { Router } from './router'
import { METHOD_NAME_ALL, METHOD_NAME_ALL_LOWERCASE, METHODS } from './router'
import { RegExpRouter } from './router/reg-exp-router'
import { SmartRouter } from './router/smart-router'
import { StaticRouter } from './router/static-router'
import { TrieRouter } from './router/trie-router'
import type {
  TypeResponse,
  HandlerInterface,
  ToAppType,
  Handler,
  ErrorHandler,
  NotFoundHandler,
  Environment,
  Route,
} from './types'
import { getPathFromURL, mergePath } from './utils/url'

type Methods = typeof METHODS[number] | typeof METHOD_NAME_ALL_LOWERCASE

interface RouterRoute {
  path: string
  method: string
  handler: Handler
}

function defineDynamicClass(): {
  new <
    E extends Partial<Environment> = {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _M extends string = string,
    P extends string = string,
    I = {},
    O = {}
  >(): {
    [M in Methods]: HandlerInterface<E, M, P, I, O>
  }
} {
  return class {} as never
}

export class Hono<
  E extends Partial<Environment> = {},
  R extends Route = Route,
  I = {},
  O = {}
> extends defineDynamicClass()<E, R['method'], R['path'], I, O> {
  readonly router: Router<Handler> = new SmartRouter({
    routers: [new StaticRouter(), new RegExpRouter(), new TrieRouter()],
  })
  readonly strict: boolean = true // strict routing - default is true
  private _tempPath: string = ''
  private path: string = '/'

  routes: RouterRoute[] = []

  constructor(init: Partial<Pick<Hono, 'router' | 'strict'>> = {}) {
    super()

    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE]
    allMethods.map((method) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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
        return this
      }
    })

    Object.assign(this, init)
  }

  private notFoundHandler: NotFoundHandler<E> = (c: Context<E>) => {
    return c.text('404 Not Found', 404)
  }

  private errorHandler: ErrorHandler<E> = (err: Error, c: Context<E>) => {
    console.trace(err)
    const message = 'Internal Server Error'
    return c.text(message, 500)
  }

  route(path: string, app?: Hono<{}>) {
    this._tempPath = path
    if (app) {
      app.routes.map((r) => {
        this.addRoute(r.method, r.path, r.handler)
      })
      this._tempPath = ''
    }
    return this
  }

  use(...middleware: Handler<E>[]): Hono<E, { method: 'all'; path: string }, I, O>
  use<Path extends string, E2 extends Partial<Environment> = E>(
    arg1: Path,
    ...middleware: Handler<E2>[]
  ): Hono<E, { method: 'all'; path: Path }, I, O>
  use(arg1: string | Handler<E>, ...handlers: Handler<E>[]) {
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

  on<Method extends string, Path extends string>(
    method: Method,
    path: Path,
    ...handlers: Handler<E, { method: Method; path: Path }>[]
  ): Hono<E, { method: Method; path: Path }, I, O>
  on(method: string, path: string, ...handlers: Handler<E>[]) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private addRoute(method: string, path: string, handler: Handler<any, any>) {
    method = method.toUpperCase()
    if (this._tempPath) {
      path = mergePath(this._tempPath, path)
    }
    this.router.add(method, path, handler)
    const r: RouterRoute = { path: path, method: method, handler: handler }
    this.routes.push(r)
  }

  private matchRoute(method: string, path: string) {
    return this.router.match(method, path)
  }

  private handleError(err: unknown, c: Context<E>) {
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
    const [path, queryIndex] = getPathFromURL(request.url, this.strict)

    const method = request.method

    const result = this.matchRoute(method, path)
    const paramData = result?.params

    const c = new Context(request, {
      env,
      executionCtx: eventOrExecutionCtx,
      notFoundHandler: this.notFoundHandler,
      paramData,
      queryIndex,
    })

    // Do not `compose` if it has only one handler
    if (result?.handlers.length === 1) {
      const handler = result.handlers[0] as unknown as Handler<E>
      let res: ReturnType<Handler>

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
        let awaited: Response | TypeResponse | void
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
    const composed = compose<Context<E>, E>(handlers, this.notFoundHandler, this.errorHandler)

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
