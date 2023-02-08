import { compose } from './compose.ts'
import { Context } from './context.ts'
import type { ExecutionContext } from './context.ts'
import type { Router } from './router.ts'
import { METHOD_NAME_ALL, METHOD_NAME_ALL_LOWERCASE, METHODS } from './router.ts'
import { RegExpRouter } from './router/reg-exp-router/index.ts'
import { SmartRouter } from './router/smart-router/index.ts'
import { TrieRouter } from './router/trie-router/index.ts'
import type {
  Env,
  ErrorHandler,
  H,
  HandlerInterface,
  MiddlewareHandler,
  MiddlewareHandlerInterface,
  NotFoundHandler,
  OnHandlerInterface,
  TypeResponse,
} from './types.ts'
import { HTTPException } from './utils/http-exception.ts'
import { getPathFromURL, mergePath } from './utils/url.ts'

type Methods = typeof METHODS[number] | typeof METHOD_NAME_ALL_LOWERCASE

interface RouterRoute {
  path: string
  method: string
  handler: H
}

function defineDynamicClass(): {
  new <E extends Env = Env, S = {}>(): {
    [M in Methods]: HandlerInterface<E, M, S>
  } & {
    on: OnHandlerInterface<E, S>
  } & {
    use: MiddlewareHandlerInterface<E, S>
  }
} {
  return class {} as never
}

export class Hono<E extends Env = Env, S = {}> extends defineDynamicClass()<E, S> {
  readonly router: Router<H> = new SmartRouter({
    routers: [new RegExpRouter(), new TrieRouter()],
  })
  readonly strict: boolean = true // strict routing - default is true
  private _tempPath: string = ''
  private path: string = '*'

  routes: RouterRoute[] = []

  constructor(init: Partial<Pick<Hono, 'router' | 'strict'>> = {}) {
    super()

    // Implementation of app.get(...handlers[]) or app.get(path, ...handlers[])
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE]
    allMethods.map((method) => {
      this[method] = (args1: string | H, ...args: H[]) => {
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

    // Implementation of app.on(method, path, ...handlers[])
    this.on = (method: string, path: string, ...handlers: H[]) => {
      if (!method) return this
      this.path = path
      handlers.map((handler) => {
        this.addRoute(method.toUpperCase(), this.path, handler)
      })
      return this
    }

    // Implementation of app.use(...handlers[]) or app.get(path, ...handlers[])
    this.use = (arg1: string | MiddlewareHandler, ...handlers: MiddlewareHandler[]) => {
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

    Object.assign(this, init)
  }

  private notFoundHandler: NotFoundHandler<E> = (c: Context<E>) => {
    return c.text('404 Not Found', 404)
  }

  private errorHandler: ErrorHandler<E> = (err: Error, c: Context<E>) => {
    if (err instanceof HTTPException) {
      return err.getResponse()
    }
    console.trace(err)
    const message = 'Internal Server Error'
    return c.text(message, 500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  route(path: string, app?: Hono<any, any>) {
    this._tempPath = path
    if (app) {
      app.routes.map((r) => {
        this.addRoute(r.method, r.path, r.handler)
      })
      this._tempPath = ''
    }
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

  private addRoute(method: string, path: string, handler: H) {
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
      const handler = result.handlers[0]
      let res: ReturnType<H>

      try {
        res = handler(c, async () => {})
        if (!res) {
          return this.notFoundHandler(c)
        }
      } catch (err) {
        return this.handleError(err, c)
      }

      if (res instanceof Response) return res

      if ('response' in res) {
        res = res.response
      }

      if (res instanceof Response) return res

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
    const composed = compose<Context, E>(handlers, this.notFoundHandler, this.errorHandler)

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

  fetch = (request: Request, Env?: E['Bindings'], executionCtx?: ExecutionContext) => {
    return this.dispatch(request, executionCtx, Env)
  }

  request = async (input: Request | string, requestInit?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, requestInit)
    return await this.fetch(req)
  }
}
