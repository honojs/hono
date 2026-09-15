import type { Params, Result, Router } from '../../router'
import { METHOD_NAME_ALL, UnsupportedPathError } from '../../router'
import { checkOptionalParameter } from '../../utils/url'

type RegExpMatchArrayWithIndices = RegExpMatchArray & { indices: [number, number][] }

type RoutePart =
  | { type: 'literal'; value: string }
  | { type: 'param'; name: string; regex?: RegExp }
const emptyParams = Object.create(null)

const splitPathRe = /\/(:\w+(?:{(?:(?:{[\d,]+})|[^}])+})?)|\/[^\/\?]+|(\?)/g
const splitByStarRe = /\*/
const buildParts = (routePath: string): RoutePart[] => {
  const parts = routePath.match(splitPathRe) as string[]
  const result: RoutePart[] = []

  for (let j = 0, len = parts.length; j < len; j++) {
    const part = parts[j]

    if (part.charCodeAt(1) === 58) {
      let name = part.slice(2)
      let regex: RegExp | undefined

      if (name.charCodeAt(name.length - 1) === 125) {
        const openBracePos = name.indexOf('{')
        const next = parts[j + 1]
        const lookahead = next && next[1] !== ':' && next[1] !== '*' ? `(?=${next})` : ''

        regex = new RegExp(name.slice(openBracePos + 1, -1) + lookahead, 'd')
        name = name.slice(0, openBracePos)
      }
      result.push({ type: 'param', name, regex })
    } else {
      result.push({ type: 'literal', value: part })
    }
  }
  return result
}
export class LinearRouter<T> implements Router<T> {
  name: string = 'LinearRouter'
  #routes: [string, string, T][] = []
  // Cache only parameter-route parsing.
  #routeParts = new Map<string, RoutePart[]>()

  add(method: string, path: string, handler: T) {
    for (
      let i = 0, paths = checkOptionalParameter(path) || [path], len = paths.length;
      i < len;
      i++
    ) {
      const routePath = paths[i]
      // Only preprocess routes that actually need it.
      if (routePath.indexOf(':') !== -1 && routePath.indexOf('*') === -1) {
        this.#routeParts.get(routePath) || this.#routeParts.set(routePath, buildParts(routePath))
      }
      this.#routes.push([method, routePath, handler])
    }
  }

  match(method: string, path: string): Result<T> {
    const handlers: [T, Params][] = []
    ROUTES_LOOP: for (let i = 0, len = this.#routes.length; i < len; i++) {
      const [routeMethod, routePath, handler] = this.#routes[i]
      if (routeMethod === method || routeMethod === METHOD_NAME_ALL) {
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
          const endsWithSlashStar = routePath.endsWith('/*')
          const parts = (
            endsWithStar ? routePath.slice(0, endsWithSlashStar ? -2 : -1) : routePath
          ).split(splitByStarRe)

          const lastIndex = parts.length - 1
          for (let j = 0, pos = 0, len = parts.length; j < len; j++) {
            const part = parts[j]
            const index = path.indexOf(part, pos)
            if (index !== pos) {
              continue ROUTES_LOOP
            }
            pos += part.length
            if (j === lastIndex) {
              if (endsWithSlashStar) {
                if (pos !== path.length && path.charCodeAt(pos) !== 47) {
                  continue ROUTES_LOOP
                }
              } else if (
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
          const params: Record<string, string> = Object.create(null)
          const parts = this.#routeParts.get(routePath)!

          const lastIndex = parts.length - 1
          for (let j = 0, pos = 0, len = parts.length; j < len; j++) {
            if (pos === -1 || pos >= path.length) {
              continue ROUTES_LOOP
            }

            const part = parts[j]
            if (part.type === 'param') {
              if (path.charCodeAt(pos) !== 47) {
                continue ROUTES_LOOP
              }

              let value

              if (part.regex) {
                const restPath = path.slice(pos + 1)
                const match = part.regex.exec(restPath) as RegExpMatchArrayWithIndices | null
                if (!match || match.indices[0][0] !== 0 || match.indices[0][1] === 0) {
                  continue ROUTES_LOOP
                }

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

              params[part.name] ||= value as string
            } else {
              const index = path.indexOf(part.value, pos)
              if (index !== pos) {
                continue ROUTES_LOOP
              }
              pos += part.value.length
            }

            if (j === lastIndex) {
              if (
                pos !== path.length &&
                !(pos === path.length - 1 && path.charCodeAt(pos) === 47)
              ) {
                continue ROUTES_LOOP
              }
            }
          }

          handlers.push([handler, params])
        } else if (hasLabel && hasStar) {
          throw new UnsupportedPathError()
        }
      }
    }

    return [handlers]
  }
}
