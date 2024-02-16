import type { Router, Result, Params } from '../../router'
import { METHOD_NAME_ALL, UnsupportedPathError } from '../../router'
import { checkOptionalParameter } from '../../utils/url'

type RegExpMatchArrayWithIndices = RegExpMatchArray & { indices: [number, number][] }

const emptyParams = {}

const splitPathRe = /\/(:\w+(?:{(?:(?:{[\d,]+})|[^}])+})?)|\/[^\/\?]+|(\?)/g
const splitByStarRe = /\*/
export class LinearRouter<T> implements Router<T> {
  name: string = 'LinearRouter'
  routes: [string, string, T][] = []

  add(method: string, path: string, handler: T) {
    ;(checkOptionalParameter(path) || [path]).forEach((p) => {
      this.routes.push([method, p, handler])
    })
  }

  match(method: string, path: string): Result<T> {
    const handlers: [T, Params][] = []
    ROUTES_LOOP: for (let i = 0, len = this.routes.length; i < len; i++) {
      const [routeMethod, routePath, handler] = this.routes[i]
      if (routeMethod !== method && routeMethod !== METHOD_NAME_ALL) {
        continue
      }
      if (routePath === '*' || routePath === '/*') {
        handlers.push([handler, emptyParams])
        continue
      }

      const hasStar = routePath.indexOf('*') !== -1
      const hasLabel = routePath.indexOf(':') !== -1
      if (!hasStar && !hasLabel) {
        if (routePath === path || routePath + '/' === path) {
          handlers.push([handler, emptyParams])
        }
      } else if (hasStar && !hasLabel) {
        const endsWithStar = routePath.charCodeAt(routePath.length - 1) === 42
        const parts = (endsWithStar ? routePath.slice(0, -2) : routePath).split(splitByStarRe)

        const lastIndex = parts.length - 1
        for (let j = 0, pos = 0, len = parts.length; j < len; j++) {
          const part = parts[j]
          const index = path.indexOf(part, pos)
          if (index !== pos) {
            continue ROUTES_LOOP
          }
          pos += part.length
          if (j === lastIndex) {
            if (
              !endsWithStar &&
              pos !== path.length &&
              !(pos === path.length - 1 && path.charCodeAt(pos) === 47)
            ) {
              continue ROUTES_LOOP
            }
          } else {
            const index = path.indexOf('/', pos)
            if (index === -1) {
              continue ROUTES_LOOP
            }
            pos = index
          }
        }
        handlers.push([handler, emptyParams])
      } else if (hasLabel && !hasStar) {
        const params: Record<string, string> = {}
        const parts = routePath.match(splitPathRe) as string[]

        const lastIndex = parts.length - 1
        for (let j = 0, pos = 0, len = parts.length; j < len; j++) {
          if (pos === -1 || pos >= path.length) {
            continue ROUTES_LOOP
          }

          const part = parts[j]
          if (part.charCodeAt(1) === 58) {
            // /:label
            let name = part.slice(2)
            let value

            if (name.charCodeAt(name.length - 1) === 125) {
              // :label{pattern}
              const openBracePos = name.indexOf('{')
              const pattern = name.slice(openBracePos + 1, -1)
              const restPath = path.slice(pos + 1)
              const match = new RegExp(pattern, 'd').exec(restPath) as RegExpMatchArrayWithIndices
              if (!match || match.indices[0][0] !== 0 || match.indices[0][1] === 0) {
                continue ROUTES_LOOP
              }
              name = name.slice(0, openBracePos)
              value = restPath.slice(...match.indices[0])
              pos += match.indices[0][1] + 1
            } else {
              let endValuePos = path.indexOf('/', pos + 1)
              if (endValuePos === -1) {
                if (pos + 1 === path.length) {
                  continue ROUTES_LOOP
                }
                endValuePos = path.length
              }
              value = path.slice(pos + 1, endValuePos)
              pos = endValuePos
            }

            params[name] ||= value as string
          } else {
            const index = path.indexOf(part, pos)
            if (index !== pos) {
              continue ROUTES_LOOP
            }
            pos += part.length
          }

          if (j === lastIndex) {
            if (pos !== path.length && !(pos === path.length - 1 && path.charCodeAt(pos) === 47)) {
              continue ROUTES_LOOP
            }
          }
        }

        handlers.push([handler, params])
      } else if (hasLabel && hasStar) {
        throw new UnsupportedPathError()
      }
    }

    return [handlers]
  }
}
