import { compose } from './compose.ts'
import { Context } from './context.ts'
import type { ExecutionContext } from './context.ts'
import { HTTPException } from './http-exception.ts'
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
  Next,
  NotFoundHandler,
  OnHandlerInterface,
  TypedResponse,
  MergePath,
  MergeSchemaPath,
} from './types.ts'
import type { RemoveBlankRecord } from './utils/types.ts'
import { getPathFromURL, mergePath } from './utils/url.ts'

type Methods = typeof METHODS[number] | typeof METHOD_NAME_ALL_LOWERCASE

interface RouterRoute {
  path: string
  method: string
  handler: H
}

function defineDynamicClass(): {
  new <E extends Env = Env, S = {}, BasePath extends string = ''>(): {
    [M in Methods]: HandlerInterface<E, M, S, BasePath>
  } & {
    on: OnHandlerInterface<E, S, BasePath>
  } & {
    use: MiddlewareHandlerInterface<E, S, BasePath>
  }
} {
  return class {} as never
}

const notFoundHandler = (c: Context) => {
  return c.text('404 Not Found', 404)
}

const errorHandler = (err: Error, c: Context) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  console.trace(err)
  const message = 'Internal Server Error'
  return c.text(message, 500)
}

export class Hono<
  E extends Env = Env,
  S = {},
  BasePath extends string = ''
> extends defineDynamicClass()<E, S, BasePath> {
  readonly router: Router<H> = new SmartRouter({
    routers: [new RegExpRouter(), new TrieRouter()],
  })
  readonly strict: boolean = true // strict routing - default is true
  private _basePath: string = ''
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this as any
      }
    })

    // Implementation of app.on(method, path, ...handlers[])
    this.on = (method: string | string[], path: string, ...handlers: H[]) => {
      if (!method) return this
      this.path = path
      for (const m of [method].flat()) {
        handlers.map((handler) => {
          this.addRoute(m.toUpperCase(), this.path, handler)
        })
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this as any
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

  private clone(): Hono<E, S, BasePath> {
    const clone = new Hono<E, S, BasePath>({
      router: this.router,
      strict: this.strict,
    })
    clone.routes = this.routes
    return clone
  }

  private notFoundHandler: NotFoundHandler = notFoundHandler
  private errorHandler: ErrorHandler = errorHandler

  route<SubPath extends string, SubEnv extends Env, SubSchema, SubBasePath extends string>(
    path: SubPath,
    app: Hono<SubEnv, SubSchema, SubBasePath>
  ): Hono<E, RemoveBlankRecord<MergeSchemaPath<SubSchema, SubPath> | S>, BasePath>
  /** @deprecated
   * Use `basePath` instead of `route` with one argument.
   * The `route` with one argument has been removed in v4.
   */
  route<SubPath extends string>(path: SubPath): Hono<E, RemoveBlankRecord<S>, BasePath>
  route<SubPath extends string, SubEnv extends Env, SubSchema, SubBasePath extends string>(
    path: SubPath,
    app?: Hono<SubEnv, SubSchema, SubBasePath>
  ): Hono<E, RemoveBlankRecord<MergeSchemaPath<SubSchema, SubPath> | S>, BasePath> {
    const subApp = this.basePath(path)

    if (!app) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return subApp as any
    }

    app.routes.map((r) => {
      const handler =
        app.errorHandler === errorHandler
          ? r.handler
          : async (c: Context, next: Next) =>
              (await compose<Context>([r.handler], app.errorHandler)(c, next)).res
      subApp.addRoute(r.method, r.path, handler)
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this as any
  }

  basePath<SubPath extends string>(path: SubPath): Hono<E, S, MergePath<BasePath, SubPath>> {
    const subApp = this.clone()
    subApp._basePath = mergePath(this._basePath, path)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return subApp as any
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
    if (this._basePath) {
      path = mergePath(this._basePath, path)
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
    const path = getPathFromURL(request.url, this.strict)
    const method = request.method

    const result = this.matchRoute(method, path)
    const paramData = result?.params

    const c = new Context(request, {
      env,
      executionCtx: eventOrExecutionCtx,
      notFoundHandler: this.notFoundHandler,
      path,
      paramData,
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
        let awaited: Response | TypedResponse | void
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
    const composed = compose<Context>(handlers, this.errorHandler, this.notFoundHandler)

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

  fetch = (request: Request, Env?: E['Bindings'] | {}, executionCtx?: ExecutionContext) => {
    return this.dispatch(request, executionCtx, Env)
  }

  request = async (input: Request | string | URL, requestInit?: RequestInit) => {
    if (input instanceof Request) {
      if (requestInit !== undefined) {
        input = new Request(input, requestInit)
      }
      return await this.fetch(input)
    }
    input = input.toString()
    const path = /^https?:\/\//.test(input) ? input : `http://localhost${mergePath('/', input)}`
    const req = new Request(path, requestInit)
    return await this.fetch(req)
  }
}
