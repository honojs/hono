import { Node } from './node'
import { compose } from './compose'
import { getPathFromURL, mergePath } from './utils/url'
import { Context } from './context'
import type { Env } from './context'
import type { Result } from './router'
import { Router, METHOD_NAME_OF_ALL } from './router'

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

export class TrieRouter<T> extends Router<T> {
  node: Node<T>

  constructor() {
    super()
    this.node = new Node()
  }

  add(method: string, path: string, handler: T) {
    this.node.insert(method, path, handler)
  }

  match(method: string, path: string): Result<T> | null {
    return this.node.search(method, path)
  }
}

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

  /* HTTP METHODS */
  get<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  get(path: string, handler: Handler): Hono {
    return this.addRoute('get', path, handler)
  }

  post<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  post(path: string, handler: Handler): Hono {
    return this.addRoute('post', path, handler)
  }

  put<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  put(path: string, handler: Handler): Hono {
    return this.addRoute('put', path, handler)
  }

  head<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  head(path: string, handler: Handler): Hono {
    return this.addRoute('head', path, handler)
  }

  delete<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  delete(path: string, handler: Handler): Hono {
    return this.addRoute('delete', path, handler)
  }

  options<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  options(path: string, handler: Handler): Hono {
    return this.addRoute('options', path, handler)
  }

  patch<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
  patch(path: string, handler: Handler): Hono {
    return this.addRoute('patch', path, handler)
  }

  /* Any methods */
  all<Path extends string>(path: Path, handler: Handler<ParamKeys<Path>>): Hono
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

  // addRoute('get', '/', handler)
  addRoute(method: string, path: string, handler: Handler): Hono {
    method = method.toUpperCase()
    if (this.tempPath) {
      path = mergePath(this.tempPath, path)
    }
    this.router.add(method, path, handler)
    return this
  }

  async matchRoute(method: string, path: string): Promise<Result<Handler>> {
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

    const handler = result ? result.handler : this.notFound // XXX

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

    const composed = compose<Context>(middleware)
    const c = new Context(request, { env: env, event: event, res: null })
    await composed(c)

    return c.res
  }

  async handleEvent(event: FetchEvent): Promise<Response> {
    return this.dispatch(event.request, {}, event).catch((err: Error) => {
      return this.onError(err)
    })
  }

  async fetch(request: Request, env?: Env, event?: FetchEvent): Promise<Response> {
    return this.dispatch(request, env, event).catch((err: Error) => {
      return this.onError(err)
    })
  }

  fire() {
    addEventListener('fetch', (event: FetchEvent): void => {
      event.respondWith(this.handleEvent(event))
    })
  }

  onError(err: Error) {
    console.error(`${err}`)
    const message = 'Internal Server Error'
    return new Response(message, {
      status: 500,
      headers: {
        'Content-Length': message.length.toString(),
      },
    })
  }

  notFound() {
    const message = 'Not Found'
    return new Response(message, {
      status: 404,
      headers: {
        'Content-Length': message.length.toString(),
      },
    })
  }
}
