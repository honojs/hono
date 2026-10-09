/**
 * @module
 * This module is the base module for the Hono object.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { compose, toError } from './compose'
import { Context } from './context'
import type { ExecutionContext } from './context'
import { GET_RESPONSE } from './context/constants'
import type { Router } from './router'
import { METHODS, METHOD_NAME_ALL, METHOD_NAME_ALL_LOWERCASE } from './router'
import type {
  Env,
  FallbackHandlerInterface,
  FetchEventLike,
  H,
  HandlerInterface,
  HTTPResponseError,
  MergePath,
  MergeSchemaPath,
  MiddlewareHandler,
  MiddlewareHandlerInterface,
  NotFoundHandler,
  OnHandlerInterface,
  RouterRoute,
  Schema,
} from './types'
import { getPath, getPathNoStrict, mergePath } from './utils/url'

const METHOD_NAME_NOT_FOUND = '@NOT_FOUND'
const METHOD_NAME_ERROR = '@ERROR'

const notFoundHandler: NotFoundHandler = (c) => {
  return c.text('404 Not Found', 404)
}

const errorHandler = (err: Error | HTTPResponseError, c: Context): Response => {
  if ('getResponse' in err) {
    const res = err.getResponse()
    return c.newResponse(res.body, res)
  }
  console.error(err)
  return c.text('Internal Server Error', 500)
}

const errorFallback: NotFoundHandler = (c) => errorHandler(c.error!, c)

const rethrow = (err: unknown): never => {
  throw err
}

const byDepthDesc = (a: [[H, RouterRoute], unknown], b: [[H, RouterRoute], unknown]): number =>
  b[0][1].depth! - a[0][1].depth!

const getResponse = (context: Context): Response => {
  if (!context.finalized) {
    throw new Error(
      'Context is not finalized. Did you forget to return a Response object or `await next()`?'
    )
  }
  return context.res
}

type GetPath<E extends Env> = (request: Request, options?: { env?: E['Bindings'] }) => string

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
   * `.onError()` adds middleware that runs when an error is caught.
   * Paths are relative to the current base path and default to `*`, for any HTTP method.
   * The error is available as `c.error`. Matching middleware runs in registration order,
   * with nested applications taking priority. If every middleware calls `next()`,
   * the built-in error handler returns the response.
   * Errors thrown by this middleware are handled by the built-in error handler.
   * Non-Error values thrown by handlers are wrapped in an Error with the original value as its cause.
   * If the thrown value is a string, it is also used as the error message.
   * Request parameters come from the original route, not this scope, and may be absent.
   *
   * @param {string} [path] - path to scope the error middleware
   * @param {...MiddlewareHandler[]} handlers - middleware to run when handling an error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError('/api/*', async (c, next) => {
   *   console.error(c.error)
   *   await next()
   * })
   * ```
   */
  onError: FallbackHandlerInterface<E, S, BasePath, CurrentPath>

  /**
   * `.notFound()` adds middleware that runs when a not-found response is requested.
   * It uses the same path scoping and ordering as `.onError()`, including for `c.notFound()`.
   * If every matching middleware calls `next()`, the built-in not-found handler returns the response.
   * Request parameters come from the original route, not this scope, and may be absent.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {string} [path] - path to scope the not-found middleware
   * @param {...MiddlewareHandler[]} handlers - middleware to run when handling not found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound('/api/*', async (c, next) => {
   *   c.header('x-not-found', 'true')
   *   await next()
   * })
   * ```
   */
  notFound: FallbackHandlerInterface<E, S, BasePath, CurrentPath>

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
        const methodName = method.toUpperCase()
        if (typeof args1 === 'string') {
          this.#path = args1
        } else {
          this.#addRoute(methodName, this.#path, args1)
        }
        args.forEach((handler) => {
          this.#addRoute(methodName, this.#path, handler)
        })
        return this as any
      }
    })

    // Implementation of app.on(method, path, ...handlers[])
    this.on = (method: string | string[], path: string | string[], ...handlers: H[]) => {
      for (const p of [path].flat()) {
        this.#path = p
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase()
          for (const handler of handlers) {
            this.#addRoute(methodName, this.#path, handler)
          }
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

    this.onError = (...handlers: (string | H)[]) =>
      this.#addRoutes(METHOD_NAME_ERROR, handlers) as any
    this.notFound = (...handlers: (string | H)[]) =>
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
    clone.routes = this.routes
    return clone
  }

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
    app.routes.forEach((r) => subApp.#addRoute(r.method, r.path, r.handler, r))
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

  #addRoute(method: string, path: string, handler: H, baseRoute?: RouterRoute): void {
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

  #dispatchInternal(method: string, c: Context<E>): Response | Promise<Response> {
    const matchResult = this.router.match(method, c.req.path)
    const handlers = matchResult[0].filter(
      ([[, route]]) => route.method === method
    ) as (typeof matchResult)[0]
    const fallback: NotFoundHandler<E> =
      method === METHOD_NAME_ERROR ? errorFallback : notFoundHandler
    if (!handlers.length) {
      return fallback(c)
    }
    handlers.sort(byDepthDesc)
    const res = c[GET_RESPONSE]
    const finalized = c.finalized
    if (res?.status && !res.bodyUsed && !res.body?.locked) {
      const mutableRes = new Response(res.body, res)
      c.res = undefined
      c.res = mutableRes
    }
    c.finalized = false

    // Capture whether an error is already being handled before compose() updates c.error.
    const handleError = c.error ? rethrow : (err: unknown) => this.#handleError(err, c)

    const composed = compose(
      handlers,
      method === METHOD_NAME_ERROR ? errorHandler : handleError,
      fallback,
      false
    )

    return composed(c)
      .then(getResponse)
      .catch(handleError)
      .finally(() => {
        // Clear the temporary response before restoring to avoid merging its headers.
        c.res = undefined
        if (method !== METHOD_NAME_ERROR) {
          c.res = res
        }
        c.finalized = finalized
      })
  }

  #handleError = (err: unknown, c: Context<E>): Response | Promise<Response> => {
    c.error = toError(err)
    return this.#dispatchInternal(METHOD_NAME_ERROR, c)
  }

  #notFound = (c: Context<E>): Response | Promise<Response> =>
    this.#dispatchInternal(METHOD_NAME_NOT_FOUND, c)

  async #dispatchComposed(
    c: Context<E>,
    matchResult: ReturnType<Router<[H, RouterRoute]>['match']>
  ): Promise<Response> {
    try {
      return getResponse(await compose(matchResult[0], this.#handleError, this.#notFound)(c))
    } catch (err) {
      return this.#handleError(err, c)
    }
  }

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
            .catch((err: unknown) => this.#handleError(err, c))
        : (res ?? this.#notFound(c))
    }

    return this.#dispatchComposed(c, matchResult)
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
}

export { Hono as HonoBase }
