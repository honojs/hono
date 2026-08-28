/**
 * @module
 * This module is the base module for the Hono object.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { compose } from './compose'
import { Context } from './context'
import type { ExecutionContext } from './context'
import type { Router } from './router'
import { METHODS, METHOD_NAME_ALL, METHOD_NAME_ALL_LOWERCASE } from './router'
import type {
  Env,
  ErrorHandler,
  FetchEventLike,
  H,
  HandlerInterface,
  IntersectNonAnyTypes,
  MergePath,
  MergeSchemaPath,
  MiddlewareHandler,
  MiddlewareHandlerInterface,
  Next,
  NotFoundHandler,
  OnHandlerInterface,
  RouterRoute,
  Schema,
} from './types'
import { COMPOSED_HANDLER } from './utils/constants'
import { getPath, getPathNoStrict, mergePath } from './utils/url'

const METHOD_NAME_NOT_FOUND = '@NOT_FOUND'
const METHOD_NAME_ERROR = '@ERROR'

const notFoundHandler: NotFoundHandler = (c) => {
  return c.text('404 Not Found', 404)
}

const errorHandler: ErrorHandler = (err, c) => {
  if ('getResponse' in err) {
    const res = err.getResponse()
    return c.newResponse(res.body, res)
  }
  console.error(err)
  return c.text('Internal Server Error', 500)
}

const getResponse = (context: Context): Response => {
  if (!context.finalized) {
    throw new Error(
      'Context is not finalized. Did you forget to return a Response object or `await next()`?'
    )
  }
  return context.res
}

type GetPath<E extends Env> = (request: Request, options?: { env?: E['Bindings'] }) => string

type FallbackHandlerInterface<
  E extends Env,
  S extends Schema,
  BasePath extends string,
  CurrentPath extends string,
> = {
  <E2 extends Env = E>(
    ...handlers: MiddlewareHandler<E2, MergePath<BasePath, '*'>, any, any>[]
  ): Hono<IntersectNonAnyTypes<[E, E2]>, S, BasePath, CurrentPath>
  <Path extends string, E2 extends Env = E>(
    path: Path,
    ...handlers: MiddlewareHandler<E2, MergePath<BasePath, Path>, any, any>[]
  ): Hono<IntersectNonAnyTypes<[E, E2]>, S, BasePath, CurrentPath>
}

export type HonoOptions<E extends Env> = {
  /**
   * `strict` option specifies whether to distinguish whether the last path is a directory or not.
   *
   * @see {@link https://hono.dev/docs/api/hono#strict-mode}
   *
   * @default true
   */
  strict?: boolean
  /**
   * `router` option specifies which router to use.
   *
   * @see {@link https://hono.dev/docs/api/hono#router-option}
   *
   * @example
   * ```ts
   * const app = new Hono({ router: new RegExpRouter() })
   * ```
   */
  router?: Router<[H, RouterRoute]>
  /**
   * `getPath` can handle the host header value.
   *
   * @see {@link https://hono.dev/docs/api/routing#routing-with-host-header-value}
   *
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
   */
  getPath?: GetPath<E>
}

type MountOptionHandler = (c: Context) => unknown
type MountReplaceRequest = (originalRequest: Request) => Request
type MountOptions =
  | MountOptionHandler
  | {
      optionHandler?: MountOptionHandler
      replaceRequest?: MountReplaceRequest | false
    }

class Hono<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/',
  CurrentPath extends string = BasePath,
> {
  get!: HandlerInterface<E, 'get', S, BasePath, CurrentPath>
  post!: HandlerInterface<E, 'post', S, BasePath, CurrentPath>
  put!: HandlerInterface<E, 'put', S, BasePath, CurrentPath>
  delete!: HandlerInterface<E, 'delete', S, BasePath, CurrentPath>
  options!: HandlerInterface<E, 'options', S, BasePath, CurrentPath>
  patch!: HandlerInterface<E, 'patch', S, BasePath, CurrentPath>
  query!: HandlerInterface<E, 'query', S, BasePath, CurrentPath>
  all!: HandlerInterface<E, 'all', S, BasePath, CurrentPath>
  on: OnHandlerInterface<E, S, BasePath>
  use: MiddlewareHandlerInterface<E, S, BasePath>

  /**
   * `.catch()` adds middleware that runs when an error is caught.
   * If every matching middleware calls `next()`, the error is passed to `.onError()`.
   *
   * @param {string} [path] - path to scope the error middleware
   * @param {...MiddlewareHandler[]} handlers - middleware to run when handling an error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.catch('/api/*', async (c, next) => {
   *   console.error(c.error)
   *   await next()
   * })
   * ```
   */
  catch: FallbackHandlerInterface<E, S, BasePath, CurrentPath>

  /**
   * `.catchNotFound()` adds middleware that runs when a not-found response is requested.
   * If every matching middleware calls `next()`, the request is passed to `.notFound()`.
   *
   * @param {string} [path] - path to scope the not-found middleware
   * @param {...MiddlewareHandler[]} handlers - middleware to run when handling not found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.catchNotFound('/api/*', async (c, next) => {
   *   c.header('x-not-found', 'true')
   *   await next()
   * })
   * ```
   */
  catchNotFound: FallbackHandlerInterface<E, S, BasePath, CurrentPath>

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
    // Implementation of app.get(...handlers[]) or app.get(path, ...handlers[])
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE]
    allMethods.forEach((method) => {
      this[method] = (args1: string | H, ...args: H[]) => {
        if (typeof args1 === 'string') {
          this.#path = args1
        } else {
          this.#addRoute(method, this.#path, args1)
        }
        args.forEach((handler) => this.#addRoute(method, this.#path, handler))
        return this as any
      }
    })

    // Implementation of app.on(method, path, ...handlers[])
    this.on = (method: string | string[], path: string | string[], ...handlers: H[]) => {
      for (const p of [path].flat()) {
        this.#path = p
        for (const m of [method].flat()) {
          handlers.map((handler) => this.#addRoute(m, this.#path, handler))
        }
      }
      return this as any
    }

    // Implementation of app.use(...handlers[]) or app.use(path, ...handlers[])
    this.use = (arg1: string | MiddlewareHandler<any>, ...handlers: MiddlewareHandler<any>[]) => {
      if (typeof arg1 === 'string') {
        this.#path = arg1
      } else {
        this.#path = '*'
        handlers.unshift(arg1)
      }
      handlers.forEach((handler) => this.#addRoute(METHOD_NAME_ALL, this.#path, handler))
      return this as any
    }

    this.catch = (...handlers: (string | H)[]) =>
      this.#addRoutes(METHOD_NAME_ERROR, handlers) as any
    this.catchNotFound = (...handlers: (string | H)[]) =>
      this.#addRoutes(METHOD_NAME_NOT_FOUND, handlers) as any

    const { strict, ...optionsWithoutStrict } = options
    Object.assign(this, optionsWithoutStrict)
    this.getPath = (strict ?? true) ? (options.getPath ?? getPath) : getPathNoStrict
  }

  #clone(): Hono<E, S, BasePath, CurrentPath> {
    const clone = new Hono<E, S, BasePath, CurrentPath>({
      router: this.router,
      getPath: this.getPath,
    })
    clone.errorHandler = this.errorHandler
    clone.#notFoundHandler = this.#notFoundHandler
    clone.routes = this.routes
    return clone
  }

  #notFoundHandler: NotFoundHandler = notFoundHandler
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  private errorHandler: ErrorHandler = errorHandler

  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route<
    SubPath extends string,
    SubEnv extends Env,
    SubSchema extends Schema,
    SubBasePath extends string,
    SubCurrentPath extends string,
  >(
    path: SubPath,
    app: Hono<SubEnv, SubSchema, SubBasePath, SubCurrentPath>
  ): Hono<E, MergeSchemaPath<SubSchema, MergePath<BasePath, SubPath>> | S, BasePath, CurrentPath> {
    const subApp = this.basePath(path)
    app.routes.map((r) => {
      let handler
      if (app.errorHandler === errorHandler || r.method === METHOD_NAME_ERROR) {
        handler = r.handler
      } else {
        handler = async (c: Context<E>, next: Next) => {
          try {
            return await r.handler(c, next)
          } catch (err) {
            return (c.res = await subApp.#handleError(err, c, app.errorHandler))
          }
        }
        ;(handler as any)[COMPOSED_HANDLER] = r.handler
      }

      subApp.#addRoute(r.method, r.path, handler, r)
    })
    return this
  }

  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath<SubPath extends string>(
    path: SubPath
  ): Hono<E, S, MergePath<BasePath, SubPath>, MergePath<BasePath, SubPath>> {
    const subApp = this.#clone()
    subApp._basePath = mergePath(this._basePath, path)
    return subApp
  }

  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler: ErrorHandler<E>): Hono<E, S, BasePath, CurrentPath> => {
    this.errorHandler = handler
    return this
  }

  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler: NotFoundHandler<E>): Hono<E, S, BasePath, CurrentPath> => {
    this.#notFoundHandler = handler
    return this
  }

  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(
    path: string,
    applicationHandler: (request: Request, ...args: any) => Response | Promise<Response>,
    options?: MountOptions
  ): Hono<E, S, BasePath, CurrentPath> {
    // handle options
    let replaceRequest: MountReplaceRequest | undefined
    let optionHandler: MountOptionHandler | undefined
    if (options) {
      if (typeof options === 'function') {
        optionHandler = options
      } else {
        optionHandler = options.optionHandler
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request
        } else {
          replaceRequest = options.replaceRequest
        }
      }
    }

    // prepare handlers for request
    const getOptions: (c: Context) => unknown[] = optionHandler
      ? (c) => {
          const options = optionHandler!(c)
          return Array.isArray(options) ? options : [options]
        }
      : (c) => {
          let executionContext: ExecutionContext | undefined = undefined
          try {
            executionContext = c.executionCtx
          } catch {} // Do nothing
          return [c.env, executionContext]
        }
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path)
      const pathPrefixLength = mergedPath === '/' ? 0 : mergedPath.length
      return (request) => {
        const url = new URL(request.url)
        url.pathname = this.getPath(request).slice(pathPrefixLength) || '/'
        return new Request(url, request)
      }
    })()

    const handler: MiddlewareHandler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c))

      if (res) {
        return res
      }

      await next()
    }
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, '*'), handler)
    return this
  }

  #addRoute(method: string, path: string, handler: H, baseRoute?: RouterRoute): void {
    method = method.toUpperCase()
    path = mergePath(this._basePath, path)
    const r: RouterRoute = {
      basePath: mergePath(this._basePath, baseRoute?.basePath ?? '/'),
      path,
      method,
      handler,
      depth: (baseRoute?.depth ?? -1) + 1,
    }
    this.router.add(method, path, [handler, r])
    this.routes.push(r)
  }

  #addRoutes(method: string, handlers: (string | H)[]): this {
    const path = typeof handlers[0] === 'string' ? (handlers.shift() as string) : '*'
    handlers.forEach((handler) => this.#addRoute(method, path, handler as H))
    return this
  }

  #dispatchInternal(
    method: string,
    c: Context<E>,
    onError: ErrorHandler<E> = this.errorHandler
  ): Response | Promise<Response> {
    const matchResult = this.router.match(method, c.req.path)
    const handlers = matchResult[0].filter(
      ([[, route]]) => route.method === method
    ) as (typeof matchResult)[0]
    const fallback: NotFoundHandler<E> =
      method === METHOD_NAME_ERROR ? (c) => onError(c.error!, c) : this.#notFoundHandler
    if (!handlers.length) {
      return fallback(c)
    }
    handlers.sort((a, b) => b[0][1].depth! - a[0][1].depth!)
    c.finalized = false

    const handleError = (err: unknown): Response | Promise<Response> => {
      if (c.error) {
        throw err
      }
      return this.#handleError(err, c)
    }

    const composed = compose(
      handlers,
      method === METHOD_NAME_ERROR ? onError : handleError,
      fallback,
      false
    )

    return composed(c).then(getResponse).catch(handleError)
  }

  #handleError = (
    err: unknown,
    c: Context<E>,
    onError: ErrorHandler<E> = this.errorHandler
  ): Response | Promise<Response> => {
    if (!(err instanceof Error)) {
      throw err
    }
    c.error = err
    return this.#dispatchInternal(METHOD_NAME_ERROR, c, onError)
  }

  #notFound = (c: Context<E>): Response | Promise<Response> =>
    this.#dispatchInternal(METHOD_NAME_NOT_FOUND, c)

  #dispatch(
    request: Request,
    executionCtx: ExecutionContext | FetchEventLike | undefined,
    env: E['Bindings'],
    method: string
  ): Response | Promise<Response> {
    // Handle HEAD method
    if (method === 'HEAD') {
      return (async () =>
        new Response(null, await this.#dispatch(request, executionCtx, env, 'GET')))()
    }

    const path = this.getPath(request, { env })
    const matchResult = this.router.match(method, path)

    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFound,
    })

    // Do not `compose` if it has only one handler
    if (matchResult[0].length === 1) {
      let res: ReturnType<H>
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFound(c)
        })
      } catch (err) {
        return this.#handleError(err, c)
      }

      return res instanceof Promise
        ? res
            .then(
              (resolved: Response | undefined) =>
                resolved || (c.finalized ? c.res : this.#notFound(c))
            )
            .catch((err: Error) => this.#handleError(err, c))
        : (res ?? this.#notFound(c))
    }

    const composed = compose(matchResult[0], this.#handleError, this.#notFound)

    return (async () => {
      try {
        return getResponse(await composed(c))
      } catch (err) {
        return this.#handleError(err, c)
      }
    })()
  }

  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} env - env Object
   * @param {ExecutionContext} executionCtx - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch: (
    request: Request,
    env?: E['Bindings'] | {},
    executionCtx?: ExecutionContext
  ) => Response | Promise<Response> = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method)
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
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (
    input: Request | string | URL,
    requestInit?: RequestInit,
    Env?: E['Bindings'] | {},
    executionCtx?: ExecutionContext
  ): Response | Promise<Response> => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx)
    }
    input = input.toString()
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath('/', input)}`,
        requestInit
      ),
      Env,
      executionCtx
    )
  }

  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = (): void =>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    addEventListener('fetch', (event: FetchEventLike): void =>
      event.respondWith(this.#dispatch(event.request, event, undefined, event.request.method))
    )
}

export { Hono as HonoBase }
