import { compose } from './compose.ts'
import { Context } from './context.ts'
import type { ExecutionContext } from './context.ts'
import { HTTPException } from './http-exception.ts'
import type { Router } from './router.ts'
import { METHOD_NAME_ALL, METHOD_NAME_ALL_LOWERCASE, METHODS } from './router.ts'
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
  FetchEventLike,
} from './types.ts'
import type { RemoveBlankRecord } from './utils/types.ts'
import { getPath, getPathNoStrict, getQueryStrings, mergePath } from './utils/url.ts'

type Methods = typeof METHODS[number] | typeof METHOD_NAME_ALL_LOWERCASE

interface RouterRoute {
  path: string
  method: string
  handler: H
}

function defineDynamicClass(): {
  new <E extends Env = Env, S = {}, BasePath extends string = '/'>(): {
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

class Hono<E extends Env = Env, S = {}, BasePath extends string = '/'> extends defineDynamicClass()<
  E,
  S,
  BasePath
> {
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router!: Router<H>
  readonly getPath: (request: Request) => string
  private _basePath: string = ''
  private path: string = '*'

  routes: RouterRoute[] = []

  constructor(init: Partial<Pick<Hono, 'router' | 'getPath'> & { strict: boolean }> = {}) {
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

    const strict = init.strict ?? true
    delete init.strict
    Object.assign(this, init)
    this.getPath = strict ? init.getPath ?? getPath : getPathNoStrict
  }

  private clone(): Hono<E, S, BasePath> {
    const clone = new Hono<E, S, BasePath>({
      router: this.router,
      getPath: this.getPath,
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
  /** @description
   * Use `basePath` instead of `route` when passing **one** argument, such as `app.route('/api')`.
   * The use of `route` with **one** argument has been removed in v4.
   * However, you can still use `route` with **two** arguments, like `app.route('/api', subApp)`."
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

  /**
   * @experimental
   * `app.mount()` is an experimental feature.
   * The API might be changed.
   */
  mount(
    path: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applicationHandler: (request: Request, ...args: any) => Response | Promise<Response>,
    optionHandler?: (c: Context) => unknown
  ): Hono<E, S, BasePath> {
    const mergedPath = mergePath(this._basePath, path)
    const pathPrefixLength = mergedPath === '/' ? 0 : mergedPath.length

    const handler: MiddlewareHandler = async (c, next) => {
      let executionContext: ExecutionContext | undefined = undefined
      try {
        executionContext = c.executionCtx
      } catch {} // Do nothing
      const options = optionHandler ? optionHandler(c) : [c.env, executionContext]
      const optionsArray = Array.isArray(options) ? options : [options]

      const queryStrings = getQueryStrings(c.req.url)
      const res = await applicationHandler(
        new Request(
          new URL((c.req.path.slice(pathPrefixLength) || '/') + queryStrings, c.req.url),
          c.req.raw
        ),
        ...optionsArray
      )

      if (res) return res

      await next()
    }
    this.addRoute(METHOD_NAME_ALL, mergePath(path, '*'), handler)
    return this
  }

  get routerName() {
    this.matchRoute('GET', '/')
    return this.router.name
  }

  /**
   * @deprecate
   * `app.head()` is no longer used.
   * `app.get()` implicitly handles the HEAD method.
   */
  head = () => {
    console.warn('`app.head()` is no longer used. `app.get()` implicitly handles the HEAD method.')
    return this
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
    return this.router.match(method, path) || { handlers: [], params: {} }
  }

  private handleError(err: unknown, c: Context<E>) {
    if (err instanceof Error) {
      return this.errorHandler(err, c)
    }
    throw err
  }

  private dispatch(
    request: Request,
    executionCtx: ExecutionContext | FetchEventLike | undefined,
    env: E['Bindings'],
    method: string
  ): Response | Promise<Response> {
    const path = this.getPath(request)

    // Handle HEAD method
    if (method === 'HEAD') {
      return (async () =>
        new Response(null, await this.dispatch(request, executionCtx, env, 'GET')))()
    }

    const { handlers, params } = this.matchRoute(method, path)

    const c = new Context(request, {
      env,
      executionCtx,
      notFoundHandler: this.notFoundHandler,
      path,
      params,
    })

    // Do not `compose` if it has only one handler
    if (handlers.length === 1) {
      let res: ReturnType<H>

      try {
        res = handlers[0](c, async () => {})
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

  /**
   * @deprecate
   * `app.handleEvent()` will be removed in v4.
   * Use `app.fetch()` instead of `app.handleEvent()`.
   */
  handleEvent = (event: FetchEventLike) => {
    return this.dispatch(event.request, event, undefined, event.request.method)
  }

  fetch = (request: Request, Env?: E['Bindings'] | {}, executionCtx?: ExecutionContext) => {
    return this.dispatch(request, executionCtx, Env, request.method)
  }

  request = (input: Request | string | URL, requestInit?: RequestInit) => {
    if (input instanceof Request) {
      if (requestInit !== undefined) {
        input = new Request(input, requestInit)
      }
      return this.fetch(input)
    }
    input = input.toString()
    const path = /^https?:\/\//.test(input) ? input : `http://localhost${mergePath('/', input)}`
    const req = new Request(path, requestInit)
    return this.fetch(req)
  }

  fire = () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    addEventListener('fetch', (event: FetchEventLike): void => {
      event.respondWith(this.dispatch(event.request, event, undefined, event.request.method))
    })
  }
}

export { Hono as HonoBase }
