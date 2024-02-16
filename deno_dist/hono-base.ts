import { compose } from './compose.ts'
import { Context } from './context.ts'
import type { ExecutionContext } from './context.ts'
import { HTTPException } from './http-exception.ts'
import { HonoRequest } from './request.ts'
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
  MergePath,
  MergeSchemaPath,
  FetchEventLike,
  Schema,
  RouterRoute,
} from './types.ts'
import { getPath, getPathNoStrict, getQueryStrings, mergePath } from './utils/url.ts'

export const COMPOSED_HANDLER = Symbol('composedHandler')

type Methods = (typeof METHODS)[number] | typeof METHOD_NAME_ALL_LOWERCASE

function defineDynamicClass(): {
  new <E extends Env = Env, S extends Schema = {}, BasePath extends string = '/'>(): {
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
  console.error(err)
  return c.text('Internal Server Error', 500)
}

type GetPath<E extends Env> = (request: Request, options?: { env?: E['Bindings'] }) => string

export type HonoOptions<E extends Env> = {
  /**
   * `strict` option specifies whether to distinguish whether the last path is a directory or not.
   * @default true
   * @see https://hono.dev/api/hono#strict-mode
   */
  strict?: boolean
  /**
   * `router` option specifices which router to use.
   * ```ts
   * const app = new Hono({ router: new RegExpRouter() })
   * ```
   * @see https://hono.dev/api/hono#router-option
   */
  router?: Router<[H, RouterRoute]>
  /**
   * `getPath` can handle the host header value.
   * @example
   * ```ts
   * const app = new Hono({
   *  getPath: (req) =>
   *   '/' + req.headers.get('host') + req.url.replace(/^https?:\/\/[^/]+(\/[^?]*)/, '$1'),
   * })
   *
   * app.get('/www1.example.com/hello', () => c.text('hello www1'))
   *
   * // A following request will match the route:
   * // new Request('http://www1.example.com/hello', {
   * //  headers: { host: 'www1.example.com' },
   * // })
   * ```
   * @see https://hono.dev/api/routing#routing-with-host-header-value
   */
  getPath?: GetPath<E>
}

class Hono<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> extends defineDynamicClass()<E, S, BasePath> {
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router!: Router<[H, RouterRoute]>
  readonly getPath: GetPath<E>
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  private _basePath: string = '/'
  #path: string = '/'

  routes: RouterRoute[] = []

  constructor(options: HonoOptions<E> = {}) {
    super()

    // Implementation of app.get(...handlers[]) or app.get(path, ...handlers[])
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE]
    allMethods.map((method) => {
      this[method] = (args1: string | H, ...args: H[]) => {
        if (typeof args1 === 'string') {
          this.#path = args1
        } else {
          this.addRoute(method, this.#path, args1)
        }
        args.map((handler) => {
          if (typeof handler !== 'string') {
            this.addRoute(method, this.#path, handler)
          }
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this as any
      }
    })

    // Implementation of app.on(method, path, ...handlers[])
    this.on = (method: string | string[], path: string | string[], ...handlers: H[]) => {
      if (!method) {
        return this
      }
      for (const p of [path].flat()) {
        this.#path = p
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.addRoute(m.toUpperCase(), this.#path, handler)
          })
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this as any
    }

    // Implementation of app.use(...handlers[]) or app.use(path, ...handlers[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.use = (arg1: string | MiddlewareHandler<any>, ...handlers: MiddlewareHandler<any>[]) => {
      if (typeof arg1 === 'string') {
        this.#path = arg1
      } else {
        this.#path = '*'
        handlers.unshift(arg1)
      }
      handlers.map((handler) => {
        this.addRoute(METHOD_NAME_ALL, this.#path, handler)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this as any
    }

    const strict = options.strict ?? true
    delete options.strict
    Object.assign(this, options)
    this.getPath = strict ? options.getPath ?? getPath : getPathNoStrict
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

  route<
    SubPath extends string,
    SubEnv extends Env,
    SubSchema extends Schema,
    SubBasePath extends string
  >(
    path: SubPath,
    app?: Hono<SubEnv, SubSchema, SubBasePath>
  ): Hono<E, MergeSchemaPath<SubSchema, MergePath<BasePath, SubPath>> & S, BasePath> {
    const subApp = this.basePath(path)

    if (!app) {
      return subApp
    }

    app.routes.map((r) => {
      let handler
      if (app.errorHandler === errorHandler) {
        handler = r.handler
      } else {
        handler = async (c: Context, next: Next) =>
          (await compose<Context>([], app.errorHandler)(c, () => r.handler(c, next))).res
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(handler as any)[COMPOSED_HANDLER] = r.handler
      }

      subApp.addRoute(r.method, r.path, handler)
    })
    return this
  }

  /**
   * `.basePath()` allows base paths to be specified.
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   * @see https://hono.dev/api/routing#base-path
   */
  basePath<SubPath extends string>(path: SubPath): Hono<E, S, MergePath<BasePath, SubPath>> {
    const subApp = this.clone()
    subApp._basePath = mergePath(this._basePath, path)
    return subApp
  }

  /**
   * `.onError()` handles an error and returns a customized Response.
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler: ErrorHandler<E>) => {
    this.errorHandler = handler
    return this
  }

  /**
   * `.notFound()` allows you to customize a Not Found Response.
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   * @see https://hono.dev/api/hono#not-found
   */
  notFound = (handler: NotFoundHandler<E>) => {
    this.notFoundHandler = handler
    return this
  }

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

      if (res) {
        return res
      }

      await next()
    }
    this.addRoute(METHOD_NAME_ALL, mergePath(path, '*'), handler)
    return this
  }

  private addRoute(method: string, path: string, handler: H) {
    method = method.toUpperCase()
    path = mergePath(this._basePath, path)
    const r: RouterRoute = { path: path, method: method, handler: handler }
    this.router.add(method, path, [handler, r])
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
    executionCtx: ExecutionContext | FetchEventLike | undefined,
    env: E['Bindings'],
    method: string
  ): Response | Promise<Response> {
    // Handle HEAD method
    if (method === 'HEAD') {
      return (async () =>
        new Response(null, await this.dispatch(request, executionCtx, env, 'GET')))()
    }

    const path = this.getPath(request, { env })
    const matchResult = this.matchRoute(method, path)

    const c = new Context(new HonoRequest(request, path, matchResult), {
      env,
      executionCtx,
      notFoundHandler: this.notFoundHandler,
    })

    // Do not `compose` if it has only one handler
    if (matchResult[0].length === 1) {
      let res: ReturnType<H>
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.notFoundHandler(c)
        })
      } catch (err) {
        return this.handleError(err, c)
      }

      return res instanceof Promise
        ? res
            .then(
              (resolved: Response | undefined) =>
                resolved || (c.finalized ? c.res : this.notFoundHandler(c))
            )
            .catch((err: Error) => this.handleError(err, c))
        : res
    }

    const composed = compose<Context>(matchResult[0], this.errorHandler, this.notFoundHandler)

    return (async () => {
      try {
        const context = await composed(c)
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
   * `.fetch()` will be entry point of your app.
   * @see https://hono.dev/api/hono#fetch
   */
  fetch = (request: Request, Env?: E['Bindings'] | {}, executionCtx?: ExecutionContext) => {
    return this.dispatch(request, executionCtx, Env, request.method)
  }

  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/api/hono#request
   */
  request = (
    input: RequestInfo | URL,
    requestInit?: RequestInit,
    Env?: E['Bindings'] | {},
    executionCtx?: ExecutionContext
  ) => {
    if (input instanceof Request) {
      if (requestInit !== undefined) {
        input = new Request(input, requestInit)
      }
      return this.fetch(input, Env, executionCtx)
    }
    input = input.toString()
    const path = /^https?:\/\//.test(input) ? input : `http://localhost${mergePath('/', input)}`
    const req = new Request(path, requestInit)
    return this.fetch(req, Env, executionCtx)
  }

  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @see https://hono.dev/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    // @ts-expect-error `event` is not the type expected by addEventListener
    addEventListener('fetch', (event: FetchEventLike): void => {
      event.respondWith(this.dispatch(event.request, event, undefined, event.request.method))
    })
  }
}

export { Hono as HonoBase }
