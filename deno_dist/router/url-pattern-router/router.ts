import type { Result, Router } from '../../router.ts'
import { METHOD_NAME_ALL } from '../../router.ts'
import type { URLPattern as URLPatternType } from './type.ts'

type Route<T> = {
  pattern: URLPatternType
  method: string
  handler: T
}

export class URLPatternRouter<T> implements Router<T> {
  private routes: Route<T>[] = []
  private duplicatedNames: Record<string, number> = {}

  add(method: string, path: string, handler: T) {
    const parts = path.split('/')

    // Disable some features for compatibility with other routers
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i]
      let unsupported = false
      // /books/{\d+}
      if (/\{/.test(part) && !/\:.+\{/.test(part)) unsupported = true
      // /books/:id+, /books/:id*
      if (/\:.+(?:\+|\*)$/.test(part)) unsupported = true
      // /*.png
      if (/\*/.test(part) && !/^\*$/.test(part)) unsupported = true
      if (unsupported) throw new Error(`Unsupported pattern: ${path}`)

      // Check duplicated names
      const match = part.match(/^:([^{]+)/)
      if (match) {
        const n = match[1]
        const p = this.duplicatedNames[n]
        if (p && p !== i) {
          throw new Error(
            `Duplicate param name, use another name instead of '${n}' - ${method} ${path} <--- '${n}'`
          )
        }
        this.duplicatedNames[n] = i
      }
    }

    this.routes.push({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      pattern: new URLPattern({
        pathname: path.replace(/{/g, '(').replace(/}/g, ')').replace(/\/\*$/, '*'),
      }) as URLPatternType,
      method,
      handler,
    })
  }

  match(method: string, path: string): Result<T> | null {
    const handlers: T[] = []
    let params: Record<string, string> | undefined = undefined
    for (const r of this.routes) {
      const match = r.pattern.exec(`http://localhost${path.replace(/\/$/, '')}`)
      if ((match && r.method === METHOD_NAME_ALL) || (match && r.method === method)) {
        handlers.push(r.handler)
        if (!/\*$/.test(r.pattern.pathname) && !params) {
          params = match.pathname.groups
        }
      }
    }
    return handlers.length
      ? {
          handlers,
          params: params ? params : {},
        }
      : null
  }
}
