import type { Result, Router } from '../../router'
import { METHOD_NAME_ALL } from '../../router'

type Route<T> = {
  pattern: RegExp
  method: string
  handler: T
}

export class URLPatternRouter<T> implements Router<T> {
  private routes: Route<T>[] = []
  private duplicatedNames: Record<string, number> = {}

  add(method: string, path: string, handler: T) {
    let endWithWildcard = false
    if (path.charCodeAt(path.length - 1) === 42) {
      endWithWildcard = true
      path = path.slice(0, -2)
    }

    const parts = path.match(/\/(:\w+(?:{[^}]+})?)|\/[^\/\?]+|(\?)/g) || []
    if (parts[parts.length - 1] === '?') {
      // end with '?'
      this.add(method, parts.slice(0, parts.length - 2).join(''), handler)
      parts.pop()
    }

    for (let i = 0, len = parts.length; i < len; i++) {
      let part = parts[i]

      if (part === '/*') {
        part = parts[i] = '/[^/]+'
      }

      // Check duplicated names
      const match = part.match(/^\/:([^{]+)(?:{(.*)})?/)
      if (match) {
        const n = match[1]
        const p = this.duplicatedNames[n]
        if (typeof p === 'number' && p !== i) {
          throw new Error(
            `Duplicate param name, use another name instead of '${n}' - ${method} ${path} <--- '${n}'`
          )
        }
        this.duplicatedNames[n] = i

        parts[i] = `/(?<${n}>${match[2] || '[^/]+'})`
      }
    }

    this.routes.push({
      pattern: new RegExp(`^${parts.join('')}${endWithWildcard ? '' : '/?$'}`),
      method,
      handler,
    })
  }

  match(method: string, path: string): Result<T> | null {
    const handlers: T[] = []
    let params: Record<string, string> | undefined = undefined
    for (const r of this.routes) {
      if (r.method === METHOD_NAME_ALL || r.method === method) {
        const match = r.pattern.exec(path)
        if (match) {
          handlers.push(r.handler)
          if (r.pattern.source.charCodeAt(r.pattern.source.length - 1) === 36) {
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
