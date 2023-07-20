import type { Result, Router } from '../../router.ts'
import { METHOD_NAME_ALL } from '../../router.ts'

type Route<T> = [RegExp, string, T] // [pattern, method, handler, path]

export class PatternRouter<T> implements Router<T> {
  name: string = 'PatternRouter'
  private routes: Route<T>[] = []
  private dNames: Record<string, number> = {} // Short name of duplicatedNames

  add(method: string, path: string, handler: T) {
    const endsWithWildcard = path[path.length - 1] === '*'
    if (endsWithWildcard) {
      path = path.slice(0, -2)
    }

    const parts = path.match(/\/?(:\w+(?:{[^}]+})?)|\/?[^\/\?]+|(\?)/g) || []
    if (parts[parts.length - 1] === '?') {
      this.add(method, parts.slice(0, parts.length - 2).join(''), handler)
      parts.pop()
    }

    for (let i = 0, len = parts.length; i < len; i++) {
      // Check duplicated names
      const match = parts[i].match(/^\/:([^{]+)(?:{(.*)})?/)
      if (match) {
        const label = match[1]
        const pos = this.dNames[label]
        if (typeof pos === 'number' && pos !== i) {
          throw new Error(
            `Duplicate param name, use another name instead of '${label}' - ${method} ${path} <--- '${label}'`
          )
        }
        this.dNames[label] = i

        parts[i] = `/(?<${label}>${match[2] || '[^/]+'})`
      } else if (parts[i] === '/*') {
        parts[i] = '/[^/]+'
      }
    }

    this.routes.push([
      new RegExp(`^${parts.join('')}${endsWithWildcard ? '' : '/?$'}`),
      method,
      handler,
    ])
  }

  match(method: string, path: string): Result<T> | null {
    const handlers: T[] = []
    const params: Record<string, string> = {}

    for (const [pattern, routeMethod, handler] of this.routes) {
      if (routeMethod === METHOD_NAME_ALL || routeMethod === method) {
        const match = pattern.exec(path)
        if (match) {
          handlers.push(handler)
          Object.assign(params, match.groups)
        }
      }
    }

    return handlers.length
      ? {
          handlers,
          params,
        }
      : null
  }
}
