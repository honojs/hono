import type { Params, Result, Router } from '../../router'
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

  /** Matches an exact static path (no wildcards or labels). */
  #matchStatic(routePath: string, path: string): boolean {
    return routePath === path || routePath + '/' === path
  }

  /**
   * Matches a wildcard-only route (no labels).
   * Returns true when the path satisfies every segment of the pattern.
   */
  #matchWildcard(routePath: string, path: string): boolean {
    const endsWithStar = routePath.charCodeAt(routePath.length - 1) === 42
    const endsWithSlashStar = routePath.endsWith('/*')
    const parts = (
      endsWithStar ? routePath.slice(0, endsWithSlashStar ? -2 : -1) : routePath
    ).split(splitByStarRe)

    const lastIndex = parts.length - 1
    for (let j = 0, pos = 0, len = parts.length; j < len; j++) {
      const part = parts[j]
      const index = path.indexOf(part, pos)
      if (index !== pos) {
        return false
      }
      pos += part.length
      if (j === lastIndex) {
        if (endsWithSlashStar) {
          if (pos !== path.length && path.charCodeAt(pos) !== 47) {
            return false
          }
        } else if (
          !endsWithStar &&
          pos !== path.length &&
          !(pos === path.length - 1 && path.charCodeAt(pos) === 47)
        ) {
          return false
        }
      } else {
        const nextSlash = path.indexOf('/', pos)
        if (nextSlash === -1) {
          return false
        }
        pos = nextSlash
      }
    }
    return true
  }

  /**
   * Extracts the value and advances `pos` for a `:label{pattern}` segment.
   * Returns null when the pattern does not match.
   */
  #extractPatternLabel(
    name: string,
    parts: string[],
    j: number,
    path: string,
    pos: number
  ): { name: string; value: string; pos: number } | null {
    const openBracePos = name.indexOf('{')
    const next = parts[j + 1]
    const lookahead = next && next[1] !== ':' && next[1] !== '*' ? `(?=${next})` : ''
    const pattern = name.slice(openBracePos + 1, -1) + lookahead
    const restPath = path.slice(pos + 1)
    const match = new RegExp(pattern, 'd').exec(restPath) as RegExpMatchArrayWithIndices
    if (!match || match.indices[0][0] !== 0 || match.indices[0][1] === 0) {
      return null
    }
    return {
      name: name.slice(0, openBracePos),
      value: restPath.slice(...match.indices[0]),
      pos: pos + match.indices[0][1] + 1,
    }
  }

  /**
   * Matches a single `/:label` (possibly with a `{pattern}`) token at `pos` and
   * returns the captured param name/value along with the next scan position, or
   * null when the token does not match the path.
   */
  #extractParam(
    name: string,
    parts: string[],
    j: number,
    path: string,
    pos: number
  ): { name: string; value: string; pos: number } | null {
    if (name.charCodeAt(name.length - 1) === 125) {
      return this.#extractPatternLabel(name, parts, j, path, pos)
    }
    let endValuePos = path.indexOf('/', pos + 1)
    if (endValuePos === -1) {
      if (pos + 1 === path.length) {
        return null
      }
      endValuePos = path.length
    }
    return {
      name,
      value: path.slice(pos + 1, endValuePos),
      pos: endValuePos,
    }
  }

  /**
   * Matches a label-only route (no wildcards) and returns the captured params,
   * or null when the path does not match the route pattern.
   */
  #matchLabel(routePath: string, path: string): Record<string, string> | null {
    const params: Record<string, string> = Object.create(null)
    const parts = routePath.match(splitPathRe) as string[]
    const lastIndex = parts.length - 1

    for (let j = 0, pos = 0, len = parts.length; j < len; j++) {
      if (pos === -1 || pos >= path.length) {
        return null
      }

      const part = parts[j]
      if (part.charCodeAt(1) === 58) {
        // /:label segment
        if (path.charCodeAt(pos) !== 47) {
          return null
        }
        const param = this.#extractParam(part.slice(2), parts, j, path, pos)
        if (!param) {
          return null
        }
        params[param.name] ||= param.value
        pos = param.pos
      } else {
        const index = path.indexOf(part, pos)
        if (index !== pos) {
          return null
        }
        pos += part.length
      }

      if (j === lastIndex) {
        if (
          pos !== path.length &&
          !(pos === path.length - 1 && path.charCodeAt(pos) === 47)
        ) {
          return null
        }
      }
    }

    return params
  }

  match(method: string, path: string): Result<T> {
    const handlers: [T, Params][] = []

    for (let i = 0, len = this.#routes.length; i < len; i++) {
      const [routeMethod, routePath, handler] = this.#routes[i]
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
        if (this.#matchStatic(routePath, path)) {
          handlers.push([handler, emptyParams])
        }
      } else if (hasStar && !hasLabel) {
        if (this.#matchWildcard(routePath, path)) {
          handlers.push([handler, emptyParams])
        }
      } else if (hasLabel && !hasStar) {
        const params = this.#matchLabel(routePath, path)
        if (params !== null) {
          handlers.push([handler, params])
        }
      } else if (hasLabel && hasStar) {
        throw new UnsupportedPathError()
      }
    }

    return [handlers]
  }
}
