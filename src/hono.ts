import { compose } from './compose'
import { getPathFromURL, mergePath } from './utils/url'
import { Context } from './context'
import type { Env } from './context'
import type { Result, Router } from './router'
import { METHOD_NAME_OF_ALL } from './router'
import { TrieRouter } from './router/trie-router' // Default Router

declare global {
  interface Request<ParamKeyType = string> {
    param: (key: ParamKeyType) => string
    query: (key: string) => string
    header: (name: string) => string
    // TODO: do not use `any`
    parsedBody: any
  }
}

export type Handler<RequestParamKeyType = string> = (
  c: Context<RequestParamKeyType>,
  next?: Function
) => Response | Promise<Response>
export type MiddlewareHandler = (c: Context, next: Function) => Promise<void>
export type NotFoundHandler = (c: Context) => Response
export type ErrorHandler = (err: Error, c: Context) => Response

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

export class Hono {
  routerClass: { new (): Router<any> } = TrieRouter
  strict: boolean = true // strict routing - default is true
  router: Router<Handler>
  middlewareRouters: Router<MiddlewareHandler>[]
  tempPath: string

  constructor(init: Partial<Pick<Hono, 'routerClass' | 'strict'>> = {}) {
    Object.assign(this, init)

    this.router = new this.routerClass()
    this.middlewareRouters = []
    this.tempPath = null
  }

  private notFoundHandler: NotFoundHandler = (c: Context) => {
    const message = '404 Not Found'
    return c.text(message, 404)
  }

  private errorHandler: ErrorHandler = (err: Error, c: Context) => {
    console.error(`${err.message}`)
    const message = 'Internal Server Error'
    return c.text(message, 500)
  }

  /* HTTP METHODS */
  get<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  get(path: string, handler: Handler<string>): Hono
  get(path: string, handler: Handler): Hono {
    return this.addRoute('get', path, handler)
  }

  post<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  post(path: string, handler: Handler<string>): Hono
  post(path: string, handler: Handler): Hono {
    return this.addRoute('post', path, handler)
  }

  put<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  put(path: string, handler: Handler<string>): Hono
  put(path: string, handler: Handler): Hono {
    return this.addRoute('put', path, handler)
  }

  head<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  head(path: string, handler: Handler<string>): Hono
  head(path: string, handler: Handler): Hono {
    return this.addRoute('head', path, handler)
  }

  delete<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  delete(path: string, handler: Handler<string>): Hono
  delete(path: string, handler: Handler): Hono {
    return this.addRoute('delete', path, handler)
  }

  options<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  options(path: string, handler: Handler<string>): Hono
  options(path: string, handler: Handler): Hono {
    return this.addRoute('options', path, handler)
  }

  patch<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  patch(path: string, handler: Handler<string>): Hono
  patch(path: string, handler: Handler): Hono {
    return this.addRoute('patch', path, handler)
  }

  /* Any methods */
  all<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  all(path: string, handler: Handler<string>): Hono
  all(path: string, handler: Handler): Hono {
    return this.addRoute('all', path, handler)
  }

  route(path: string): Hono {
    const newHono: Hono = new Hono()
    newHono.tempPath = path
    newHono.router = this.router
    return newHono
  }

  use(path: string, middleware: MiddlewareHandler): void {
    if (middleware.constructor.name !== 'AsyncFunction') {
      throw new TypeError('middleware must be a async function!')
    }
    const router = new this.routerClass()
    router.add(METHOD_NAME_OF_ALL, path, middleware)
    this.middlewareRouters.push(router)
  }

  onError(handler: ErrorHandler): Hono {
    this.errorHandler = handler
    return this
  }

  notFound(handler: NotFoundHandler): Hono {
    this.notFoundHandler = handler
    return this
  }

  // addRoute('get', '/', handler)
  private addRoute(method: string, path: string, handler: Handler): Hono {
    method = method.toUpperCase()
    if (this.tempPath) {
      path = mergePath(this.tempPath, path)
    }
    this.router.add(method, path, handler)
    return this
  }

  private async matchRoute(method: string, path: string): Promise<Result<Handler>> {
    return this.router.match(method, path)
  }

  async dispatch(request: Request, env?: Env, event?: FetchEvent): Promise<Response> {
    const path = getPathFromURL(request.url, { strict: this.strict })
    const method = request.method

    const result = await this.matchRoute(method, path)

    // Methods for Request object
    request.param = (key: string): string => {
      if (result) {
        return result.params[key]
      }
    }
    request.header = (name: string): string => {
      return request.headers.get(name)
    }
    request.query = (key: string): string => {
      const url = new URL(c.req.url)
      return url.searchParams.get(key)
    }

    const handler = result ? result.handler : this.notFoundHandler

    const middleware = []

    for (const mr of this.middlewareRouters) {
      const mwResult = mr.match(METHOD_NAME_OF_ALL, path)
      if (mwResult) {
        middleware.push(mwResult.handler)
      }
    }

    const wrappedHandler = async (context: Context, next: Function) => {
      const res = await handler(context)
      if (!(res instanceof Response)) {
        throw new TypeError('response must be a instace of Response')
      }
      context.res = res
      await next()
    }

    middleware.push(wrappedHandler)

    const composed = compose<Context>(middleware, this.errorHandler)
    const c = new Context(request, { env: env, event: event, res: null })
    c.notFound = () => this.notFoundHandler(c)

    const context = await composed(c)

    return context.res
  }

  async handleEvent(event: FetchEvent): Promise<Response> {
    return this.dispatch(event.request, {}, event)
  }

  async fetch(request: Request, env?: Env, event?: FetchEvent): Promise<Response> {
    return this.dispatch(request, env, event)
  }

  request(input: RequestInfo, requestInit?: RequestInit) {
    const req = new Request(input, requestInit)
    return this.dispatch(req)
  }

  fire() {
    addEventListener('fetch', (event: FetchEvent): void => {
      event.respondWith(this.handleEvent(event))
    })
  }
}
