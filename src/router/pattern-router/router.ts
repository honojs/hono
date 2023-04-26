import type { Result, Router } from '../../router'
import { METHOD_NAME_ALL } from '../../router'

type Route<T> = [RegExp, string, T] // [pattern, method, handler]

export class PatternRouter<T> implements Router<T> {
  private routes: Route<T>[] = []
  private duplicatedNames: Record<string, number> = {}

  add(method: string, path: string, handler: T) {
    const endsWithWildcard = path.endsWith('*')
    if (endsWithWildcard) {
      path = path.slice(0, -2)
    }

    const parts = path.match(/\/(:\w+(?:{[^}]+})?)|\/[^\/\?]+|(\?)/g) || []
    if (parts[parts.length - 1] === '?') {
      this.add(method, parts.slice(0, parts.length - 2).join(''), handler)
      parts.pop()
    }

    for (let i = 0, len = parts.length; i < len; i++) {
      // Check duplicated names
      const match = parts[i].match(/^\/:([^{]+)(?:{(.*)})?/)
      if (match) {
        const label = match[1]
        const pos = this.duplicatedNames[label]
        if (typeof pos === 'number' && pos !== i) {
          throw new Error(
            `Duplicate param name, use another name instead of '${label}' - ${method} ${path} <--- '${label}'`
          )
        }
        this.duplicatedNames[label] = i

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
    let params: Record<string, string> | undefined = undefined
    for (const [pattern, routeMethod, handler] of this.routes) {
      if (routeMethod === METHOD_NAME_ALL || routeMethod === method) {
        const match = pattern.exec(path)
        if (match) {
          handlers.push(handler)
          if (pattern.source.charCodeAt(pattern.source.length - 1) === 36) {
            params ??= match.groups || {}
          }
        }
      }
    }
    return handlers.length
      ? {
          handlers,
          params: params || {},
        }
      : null
  }
}
