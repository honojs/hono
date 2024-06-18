import type { Params, Result, Router } from '../../router'
import { METHOD_NAME_ALL, UnsupportedPathError } from '../../router'

type Route<T> = [RegExp, string, T] // [pattern, method, handler, path]

export class PatternRouter<T> implements Router<T> {
  name: string = 'PatternRouter'
  private routes: Route<T>[] = []

  add(method: string, path: string, handler: T) {
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

  match(method: string, path: string): Result<T> {
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
