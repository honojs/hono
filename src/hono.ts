import type { Result } from './node'
import { Node } from './node'
import { compose } from './compose'
import { getPathFromURL } from './utils/url'
import { Context } from './context'
import type { Env } from './context'

const METHOD_NAME_OF_ALL = 'ALL'

declare global {
  interface Request {
    param: (key: string) => string
    query: (key: string) => string
    header: (name: string) => string
    parsedBody: any
  }
}

export type Handler = (c: Context, next?: Function) => Response | Promise<Response>
export type MiddlewareHandler = (c: Context, next: Function) => Promise<void>

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

export class Hono {
  router: Router<Handler[]>
  middlewareRouters: Router<MiddlewareHandler>[]
  tempPath: string

  constructor() {
    this.router = new Router()
    this.middlewareRouters = []
    this.tempPath = '/'
  }

  /* HTTP METHODS */
  get(arg: string | Handler, ...args: Handler[]): Hono {
    return this.addRoute('get', arg, ...args)
  }
  post(arg: string | Handler, ...args: Handler[]): Hono {
    return this.addRoute('post', arg, ...args)
  }
  put(arg: string | Handler, ...args: Handler[]): Hono {
    return this.addRoute('put', arg, ...args)
  }
  head(arg: string | Handler, ...args: Handler[]): Hono {
    return this.addRoute('head', arg, ...args)
  }
  delete(arg: string | Handler, ...args: Handler[]): Hono {
    return this.addRoute('delete', arg, ...args)
  }
  options(arg: string | Handler, ...args: Handler[]): Hono {
    return this.addRoute('options', arg, ...args)
  }
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
    const [method, path] = [request.method, getPathFromURL(request.url)]

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
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Content-Length': message.length.toString(),
      },
    })
  }
}
