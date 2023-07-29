import type { ExecutionContext } from './context'
import { HonoRequest } from './request'
import type { Router } from './router'
import { METHOD_NAME_ALL_LOWERCASE, METHODS } from './router'
import type { Env, H, HandlerInterface, FetchEventLike } from './types'
import { getPath } from './utils/url'

type Methods = typeof METHODS[number] | typeof METHOD_NAME_ALL_LOWERCASE

function defineDynamicClass(): {
  new <E extends Env = Env>(): {
    [M in Methods]: HandlerInterface<E, M>
  }
} {
  return class {} as never
}

export class Hono<E extends Env = Env> extends defineDynamicClass()<E> {
  router!: Router<H>
  _path: string = '*'

  constructor(init: Partial<Pick<Hono, 'router'> & { strict: boolean }> = {}) {
    super()

    if (init.router) {
      this.router = init.router
    }

    // Implementation of app.get(...handlers[]) or app.get(path, ...handlers[])
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE]
    allMethods.map((method) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this[method] = (args1: string | H, ...args: H[]) => {
        if (typeof args1 === 'string') {
          this._path = args1
        } else {
          this._addRoute(method, this._path, args1)
        }
        args.map((handler) => {
          if (typeof handler !== 'string') {
            this._addRoute(method, this._path, handler)
          }
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this as any
      }
    })
  }

  _addRoute(method: string, path: string, handler: H) {
    method = method.toUpperCase()
    this.router.add(method, path, handler)
  }

  _matchRoute(method: string, path: string) {
    return this.router.match(method, path) || { handlers: [], params: {} }
  }

  private _dispatch(
    request: Request,
    executionCtx: ExecutionContext | FetchEventLike | undefined,
    env: E['Bindings'],
    method: string
  ): Response | Promise<Response> {
    const path = getPath(request)

    const { handlers, params } = this._matchRoute(method, path)
    const c = {
      req: new HonoRequest(request, path, params),
      env,
      executionCtx,
      path,
      params,
      json: (j: object) =>
        new Response(JSON.stringify(j), {
          headers: { 'content-type': 'application/json' },
        }),
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    return handlers[0](c)
  }

  fetch = (request: Request, Env?: E['Bindings'] | {}, executionCtx?: ExecutionContext) => {
    return this._dispatch(request, executionCtx, Env, request.method)
  }
}
