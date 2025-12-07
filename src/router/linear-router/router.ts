import type { Params, Result, Router, ParamIndexMap, ParamStash } from '../../router'
import { METHOD_NAME_ALL, UnsupportedPathError } from '../../router'
import { checkOptionalParameter } from '../../utils/url'

type RegExpMatchArrayWithIndices = RegExpMatchArray & { indices: [number, number][] }

const emptyParams = Object.create(null)

const splitPathRe = /\/(:\w+(?:{(?:(?:{[\d,]+})|[^}])+})?)|\/[^\/\?]+|(\?)/g
const splitByStarRe = /\*/
export class LinearRouter<T> implements Router<T> {
  name: string = 'LinearRouter'
  #routes: [string, string, T][] = []

  add(method: string, path: string, handler: T) {
    for (
      let i = 0, paths = checkOptionalParameter(path) || [path], len = paths.length;
      i < len;
      i++
    ) {
      this.#routes.push([method, paths[i], handler])
    }
  }

  match(method: string, path: string): Result<T> {
    const handlers: [T, Params][] = []
    for (let i = 0, len = this.#routes.length; i < len; i++) {
      const [routeMethod, routePath, handler] = this.#routes[i]
      if (routeMethod === method || routeMethod === METHOD_NAME_ALL) {
        const matchResult = LinearRouter.matchRoute(path, routePath)
        if (matchResult) {
          handlers.push([handler, matchResult.params])
        } else if (routePath === '*' || routePath === '/*') {
          handlers.push([handler, emptyParams])
        }
      }
    }

    return [handlers]
  }

  /**
   * Static method to match a path against a route pattern.
   * This is the same matching logic used internally by the LinearRouter.
   *
   * @param path - The actual path to match
   * @param routePath - The route pattern (e.g., '/user/:id/:action')
   * @returns Object containing paramIndexMap, paramStash, and params, or null if no match
   */
  static matchRoute(
    path: string,
    routePath: string
  ): {
    paramIndexMap: ParamIndexMap
    paramStash: ParamStash
    params: Params
  } | null {
    const params: Params = Object.create(null)
    const paramIndexMap: ParamIndexMap = Object.create(null)
    const paramStash: ParamStash = []

    if (routePath === '*' || routePath === '/*') {
      return { paramIndexMap, paramStash, params }
    }

    const hasStar = routePath.indexOf('*') !== -1
    const hasLabel = routePath.indexOf(':') !== -1

    if (!hasStar && !hasLabel) {
      if (routePath === path || routePath + '/' === path) {
        return { paramIndexMap, paramStash, params }
      }
      return null
    }

    if (hasStar && !hasLabel) {
      const endsWithStar = routePath.charCodeAt(routePath.length - 1) === 42
      const parts = (endsWithStar ? routePath.slice(0, -2) : routePath).split(splitByStarRe)

      const lastIndex = parts.length - 1
      for (let j = 0, pos = 0, len = parts.length; j < len; j++) {
        const part = parts[j]
        const index = path.indexOf(part, pos)
        if (index !== pos) {
          return null
        }
        pos += part.length

        if (j === lastIndex) {
          if (
            !endsWithStar &&
            pos !== path.length &&
            !(pos === path.length - 1 && path.charCodeAt(pos) === 47)
          ) {
            return null
          }
        } else {
          const index = path.indexOf('/', pos)
          if (index === -1) {
            return null
          }
          pos = index
        }
      }
      return { paramIndexMap, paramStash, params }
    }

    if (hasLabel && !hasStar) {
      const parts = routePath.match(splitPathRe) as string[]

      if (!parts) {
        return null
      }

      let paramIndex = 0
      let pos = 0

      for (let j = 0; j < parts.length; j++) {
        if (pos === -1 || pos >= path.length) {
          return null
        }

        const part = parts[j]

        if (part.charCodeAt(1) === 58) {
          // /:label
          let name = part.slice(2)
          let value: string

          if (name.charCodeAt(name.length - 1) === 125) {
            // :label{pattern}
            const openBracePos = name.indexOf('{')
            const next = parts[j + 1]
            const lookahead = next && next[1] !== ':' && next[1] !== '*' ? `(?=${next})` : ''
            const pattern = name.slice(openBracePos + 1, -1) + lookahead
            const restPath = path.slice(pos + 1)
            const match = new RegExp(pattern, 'd').exec(restPath) as RegExpMatchArrayWithIndices

            if (!match || match.indices[0][0] !== 0 || match.indices[0][1] === 0) {
              return null
            }

            name = name.slice(0, openBracePos)
            value = restPath.slice(...match.indices[0])
            pos += match.indices[0][1] + 1
          } else {
            let endValuePos = path.indexOf('/', pos + 1)
            if (endValuePos === -1) {
              if (pos + 1 === path.length) {
                return null
              }
              endValuePos = path.length
            }
            value = path.slice(pos + 1, endValuePos)
            pos = endValuePos
          }

          params[name] ||= value
          paramIndexMap[name] = paramIndex
          paramStash[paramIndex] = value
          paramIndex++
        } else {
          const index = path.indexOf(part, pos)
          if (index !== pos) {
            return null
          }
          pos += part.length
        }

        if (j === parts.length - 1) {
          if (pos !== path.length && !(pos === path.length - 1 && path.charCodeAt(pos) === 47)) {
            return null
          }
        }
      }

      return { paramIndexMap, paramStash, params }
    }

    if (hasLabel && hasStar) {
      throw new UnsupportedPathError()
    }

    return null
  }
}
