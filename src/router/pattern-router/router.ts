import type { Params, Result, Router } from '../../router'
import { METHOD_NAME_ALL, UnsupportedPathError } from '../../router'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type Route<T> = [RegExp, string, T] // [pattern, method, handler, path]

/**
 * A router that matches routes using regular expression patterns.
 */
export class PatternRouter<T> implements Router<T> {
  name: string = 'PatternRouter'

  private routes: Route<T>[] = []

  /**
   * Adds a route to the router.
   *
   * @param method - The http method for the route.
   * @param path - The path pattern for the route.
   * @param handler - The handler function for the route.
   */
  add(method: HttpMethod, path: string, handler: T) {
    const endsWithWildcard = path[path.length - 1] === '*'
    if (endsWithWildcard) {
      path = path.slice(0, -2)
    }
    if (path.at(-1) === '?') {
      path = path.slice(0, -1)
      this.add(method, path.replace(/\/[^/]+$/, ''), handler)
    }

    const parts = (path.match(/\/?(:\w+(?:{(?:(?:{[\d,]+})|[^}])+})?)|\/?[^\/\?]+/g) || []).map(
      (part) => {
        const match = part.match(/^\/:([^{]+)(?:{(.*)})?/)
        return match
          ? `/(?<${match[1]}>${match[2] || '[^/]+'})`
          : part === '/*'
          ? '/[^/]+'
          : part.replace(/[.\\+*[^\]$()]/g, '\\$&')
      }
    )

    let re
    try {
      re = new RegExp(`^${parts.join('')}${endsWithWildcard ? '' : '/?$'}`)
    } catch (e) {
      throw new UnsupportedPathError()
    }

    this.routes.push([re, method, handler])
  }

  /**
   * Matches a given method and path against the routes in the router.
   *
   * @param method - The HTTP method of route.
   * @param path - The path to match.
   * @returns The matched handlers and parameters.
   */
  match(method: HttpMethod, path: string): Result<T> {
    const handlers: [T, Params][] = []

    for (const [pattern, routeMethod, handler] of this.routes) {
      if (routeMethod === METHOD_NAME_ALL || routeMethod === method) {
        const match = pattern.exec(path)
        if (match) {
          handlers.push([handler, match.groups || Object.create(null)])
        }
      }
    }

    return [handlers]
  }
}
