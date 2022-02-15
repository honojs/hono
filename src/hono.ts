import type { Result } from './node'
import { Node, METHOD_NAME_OF_ALL } from './node'
import { compose } from './compose'
import { getPathFromURL } from './utils/url'
import { Context } from './context'
import type { Env } from './context'

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

export class Router<T> {
  node: Node<T>

  constructor() {
    this.node = new Node()
  }

  add(method: string, path: string, handler: T) {
    this.node.insert(method, path, handler)
  }

  match(method: string, path: string): Result<T> | null {
    return this.node.search(method, path)
  }
}

type Init = {
  strict?: boolean
}

export class Hono {
  router: Router<Handler[]>
  middlewareRouters: Router<MiddlewareHandler>[]
  tempPath: string
  strict: boolean

  constructor(init: Init = { strict: true }) {
    this.router = new Router()
    this.middlewareRouters = []
    this.tempPath = '/'
    this.strict = init.strict // strict routing - default is true
  }

  /* HTTP METHODS */
  get<Path extends string>(arg: Path, ...args: Handler<ParamKeys<Path>>[]): Hono
  get(arg: Handler<never>, ...args: Handler<never>[]): Hono
  get(arg: string | Handler, ...args: Handler[]): Hono {
    return this.addRoute('get', arg, ...args)
  }

  post<Path extends string>(arg: Path, ...args: Handler<ParamKeys<Path>>[]): Hono
  post(arg: Handler, ...args: Handler[]): Hono
  post(arg: string | Handler, ...args: Handler[]): Hono {
    return this.addRoute('post', arg, ...args)
  }

  put<Path extends string>(arg: Path, ...args: Handler<ParamKeys<Path>>[]): Hono
  put(arg: Handler, ...args: Handler[]): Hono
  put(arg: string | Handler, ...args: Handler[]): Hono {
    return this.addRoute('put', arg, ...args)
  }

  head<Path extends string>(arg: Path, ...args: Handler<ParamKeys<Path>>[]): Hono
  head(arg: Handler, ...args: Handler[]): Hono
  head(arg: string | Handler, ...args: Handler[]): Hono {
    return this.addRoute('head', arg, ...args)
  }

  delete<Path extends string>(arg: Path, ...args: Handler<ParamKeys<Path>>[]): Hono
  delete(arg: Handler, ...args: Handler[]): Hono
  delete(arg: string | Handler, ...args: Handler[]): Hono {
    return this.addRoute('delete', arg, ...args)
  }

  options<Path extends string>(arg: Path, ...args: Handler<ParamKeys<Path>>[]): Hono
  options(arg: Handler, ...args: Handler[]): Hono
  options(arg: string | Handler, ...args: Handler[]): Hono {
    return this.addRoute('options', arg, ...args)
  }

  patch<Path extends string>(arg: Path, ...args: Handler<ParamKeys<Path>>[]): Hono
  patch(arg: Handler, ...args: Handler[]): Hono
  patch(arg: string | Handler, ...args: Handler[]): Hono {
    return this.addRoute('patch', arg, ...args)
  }

  /*
  We may implement these HTTP methods:
  trace
  copy
  lock
  purge
  unlock
  report
  checkout
  merge
  notify
  subscribe
  unsubscribe
  search
  connect
  */

  all<Path extends string>(arg: Path, ...args: Handler<ParamKeys<Path>>[]): Hono
  all(arg: Handler<never>, ...args: Handler<never>[]): Hono
  all(arg: string | Handler, ...args: Handler[]): Hono {
    return this.addRoute('all', arg, ...args)
  }

  route(path: string): Hono {
    this.tempPath = path
    return this
  }

  use(path: string, middleware: MiddlewareHandler): void {
    if (middleware.constructor.name !== 'AsyncFunction') {
      throw new TypeError('middleware must be a async function!')
    }

    const router = new Router<MiddlewareHandler>()
    router.add(METHOD_NAME_OF_ALL, path, middleware)
    this.middlewareRouters.push(router)
  }

  // addRoute('get', '/', handler)
  addRoute(method: string, arg: string | Handler, ...args: Handler[]): Hono {
    method = method.toUpperCase()
    if (typeof arg === 'string') {
      this.tempPath = arg
      this.router.add(method, arg, args)
    } else {
      args.unshift(arg)
      this.router.add(method, this.tempPath, args)
    }
    return this
  }

  async matchRoute(method: string, path: string): Promise<Result<Handler[]>> {
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

    const handler = result ? result.handler[0] : this.notFound // XXX

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
