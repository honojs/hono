/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { Router, Result } from '../../router'
import { METHOD_NAME_ALL, UnsupportedPathError } from '../../router'

const hasStarRe = /\*/
const hasLabelRe = /:/
const splitPathRe = /\/(:\w+(?:{[^}]+})?)|\/[^\/\?]+|(\?)/g
const splitByStarRe = /\*/
export class LinearRouter<T> implements Router<T> {
  routes: [string, string, T][] = []

  add(method: string, path: string, handler: T) {
    if (path.charCodeAt(path.length - 1) === 63) {
      this.routes.push([method, path.slice(0, -1), handler])
      this.routes.push([method, path.replace(/\/[^/]+$/, ''), handler])
    } else {
      this.routes.push([method, path, handler])
    }
  }

  match(method: string, path: string): Result<T> | null {
    const handlers: T[] = []
    const params: Record<string, string> = {}
    ROUTES_LOOP: for (let i = 0; i < this.routes.length; i++) {
      const [routeMethod, routePath, handler] = this.routes[i]
      if (routeMethod !== method && routeMethod !== METHOD_NAME_ALL) {
        continue
      }
      if (routePath === '*' || routePath === '/*') {
        handlers.push(handler)
        continue
      }

      const hasStar = hasStarRe.test(routePath)
      const hasLabel = hasLabelRe.test(routePath)
      if (!hasStar && !hasLabel) {
        if (routePath === path) {
          handlers.push(handler)
        }
      } else if (hasStar && !hasLabel) {
        let parts
        if (routePath.charCodeAt(routePath.length - 1) === 42) {
          // ends with star
          parts = routePath.slice(0, -2).split(splitByStarRe)
        } else {
          parts = routePath.split(splitByStarRe)
        }

        const lastIndex = parts.length - 1
        for (let j = 0, pos = 0; j < parts.length; j++) {
          const part = parts[j]
          const index = path.indexOf(part, pos)
          if (index !== pos) {
            continue ROUTES_LOOP
          }
          pos = part.length
          if (j !== lastIndex) {
            const index = path.indexOf('/', pos)
            if (index === -1) {
              continue ROUTES_LOOP
            }
            pos = index
          }
        }
        handlers.push(handler)
      } else if (hasLabel && !hasStar) {
        const localParams: Record<string, string> = {}
        const parts = routePath.match(splitPathRe) as string[]
        for (let j = 0, pos = 0; j < parts.length; j++) {
          const part = parts[j]
          if (part.charCodeAt(1) === 58) {
            let name = part.slice(2)
            const index = path.indexOf('/', pos + 1)
            const value = path.slice(pos + 1, index === -1 ? undefined : index)
            if (name.charCodeAt(name.length - 1) === 125) {
              const index = name.indexOf('{')
              const pattern = name.slice(index + 1, -1)
              if (!new RegExp(pattern).test(value)) {
                continue ROUTES_LOOP
              }
              name = name.slice(0, index)
            }
            localParams[name] = value
            pos = index
          } else {
            const index = path.indexOf(part, pos)
            if (index !== pos) {
              continue ROUTES_LOOP
            }
            pos += part.length
          }
        }
        Object.assign(params, localParams)
        handlers.push(handler)
      } else if (hasLabel && hasStar) {
        // TODO: implement
        throw new UnsupportedPathError()
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
