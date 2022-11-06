/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { Router, Result } from '../../router.ts'
import { METHOD_NAME_ALL, METHODS, UnsupportedPathError } from '../../router.ts'

export class StaticRouter<T> implements Router<T> {
  middleware: Record<string, Result<T>>
  routes: Record<string, Record<string, Result<T>>>

  constructor() {
    this.middleware = {}

    this.routes = {} as StaticRouter<T>['routes']
    ;[METHOD_NAME_ALL, ...METHODS].forEach((method) => {
      this.routes[method.toUpperCase()] = {}
    })
  }

  private newRoute(): Record<string, Result<T>> {
    const route: Record<string, Result<T>> = {}
    const routeAll = this.routes[METHOD_NAME_ALL]
    Object.keys(routeAll).forEach((path) => {
      route[path] = {
        handlers: [...routeAll[path].handlers],
        params: {},
      }
    })

    return route
  }

  add(method: string, path: string, handler: T) {
    const { middleware, routes } = this

    routes[method] ||= this.newRoute()

    if (path === '/*') {
      path = '*'
    }

    if (path === '*') {
      if (method === METHOD_NAME_ALL) {
        middleware[METHOD_NAME_ALL] ||= { handlers: [], params: {} }
        Object.keys(middleware).forEach((m) => {
          middleware[m].handlers.push(handler)
        })
        Object.keys(routes).forEach((m) => {
          Object.values(routes[m]).forEach((matchRes) => matchRes.handlers.push(handler))
        })
      } else {
        middleware[method] ||= {
          handlers: [...(middleware[METHOD_NAME_ALL]?.handlers || [])],
          params: {},
        }
        middleware[method].handlers.push(handler)
        if (routes[method]) {
          Object.values(routes[method]).forEach((matchRes) => matchRes.handlers.push(handler))
        }
      }
      return
    }

    if (/\*|\/:/.test(path)) {
      throw new UnsupportedPathError(path)
    }

    routes[method][path] ||= {
      handlers: [
        ...(routes[METHOD_NAME_ALL][path]?.handlers ||
          middleware[method]?.handlers ||
          middleware[METHOD_NAME_ALL]?.handlers ||
          []),
      ],
      params: {},
    }
    if (method === METHOD_NAME_ALL) {
      Object.keys(routes).forEach((m) => {
        routes[m][path]?.handlers?.push(handler)
      })
    } else {
      routes[method][path].handlers.push(handler)
    }
  }

  match(method: string, path: string): Result<T> | null {
    const { routes, middleware } = this

    this.match = (method, path) =>
      routes[method][path] ||
      routes[METHOD_NAME_ALL][path] ||
      middleware[method] ||
      middleware[METHOD_NAME_ALL] ||
      null

    return this.match(method, path)
  }
}
