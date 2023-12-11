import type { Result, Router, ParamIndexMap } from '../../router'
import { METHOD_NAME_ALL } from '../../router'

const MAX_PATH_LENGTH = 99
const STATIC_SORT_SCORE = MAX_PATH_LENGTH + 1
const emptyParam: string[] = []
const emptyParamIndexMap = {}

type HandlerData<T> = [T, ParamIndexMap][]
type StaticMap<T> = Record<string, Result<T>>
type MatcherWithHint<T> = [string, number, Record<string, number>, HandlerData<T>[], StaticMap<T>]
type Matcher<T> = [RegExp, HandlerData<T>[], StaticMap<T>]

type Route<T> = [number, number, string, boolean, string, string[], T] // [sortScore, index, method, isMiddleware, regexpStr, params]

function addMatchers<T>(
  matchersWithHint: Record<string, MatcherWithHint<T>>,
  method: string,
  [, index, , isMiddleware, regexpStr, params, handler]: Route<T>
) {
  if (!matchersWithHint[method]) {
    // new method
    if (matchersWithHint[METHOD_NAME_ALL]) {
      const template = matchersWithHint[METHOD_NAME_ALL]
      matchersWithHint[method] = [
        template[0],
        template[1],
        { ...template[2] },
        [...template[3]],
        Object.keys(template[4]).reduce<StaticMap<T>>((map, k) => {
          map[k] = [template[4][k][0].slice() as HandlerData<T>, emptyParam]
          return map
        }, {}),
      ]
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      matchersWithHint[method] = ['', 0, [] as any, [], {}]
    }
  }
  const matcher = matchersWithHint[method]
  if (params.length === 0 && !isMiddleware) {
    // static routes
    ;(matcher[4][regexpStr] ||= [[], emptyParam] as Result<T>)[0][index] = [
      handler,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emptyParam as any,
    ]
    return
  }

  if (matcher[2][regexpStr]) {
    // already registered with the same routing
    const handlerData = matcher[3][matcher[2][regexpStr]]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handlerData[index] = [handler, handlerData.find(Boolean)?.[1] as any]
  } else {
    const handlerData = []
    handlerData[index] = [
      handler,
      params.length === 0
        ? emptyParamIndexMap
        : params.reduce<Record<string, number>>((map, param) => {
            map[param] = ++matcher[1]
            return map
          }, {}),
    ]
    ++matcher[1]
    matcher[2][regexpStr] = matcher[1]
    matcher[3][matcher[1]] = handlerData as HandlerData<T>
    matcher[0] += `${matcher[0].length === 0 ? '^' : '|'}${regexpStr}()`
  }

  if (isMiddleware) {
    // search for existing handlers with forward matching and add handlers to those that match
    Object.keys(matcher[2]).forEach((k) => {
      if (k === regexpStr) {
        return
      }
      if (k.startsWith(regexpStr)) {
        const handlerData = matcher[3][matcher[2][k]]
        const paramIndexMap =
          params.length === 0
            ? emptyParamIndexMap
            : params.reduce<Record<string, number>>((map, param) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                map[param] = handlerData.find(Boolean)?.[1][param] as any
                return map
              }, {})
        handlerData[index] = [handler, paramIndexMap]
      }
    })
    Object.keys(matcher[4]).forEach((k) => {
      if (k.startsWith(regexpStr)) {
        ;(matcher[4][k][0] as [[T, ParamIndexMap]])[index] = [handler, emptyParamIndexMap]
      }
    })
  }
}

export class FilePatternRouter<T> implements Router<T> {
  name: string = 'FilePatternRouter'
  #routes: Route<T>[] = []

  add(method: string, path: string, handler: T) {
    const isMiddleware = path[path.length - 1] === '*'
    if (isMiddleware) {
      path = path.slice(0, -2)
    }

    if (!isMiddleware && path.indexOf(':') === -1) {
      this.#routes.push([
        STATIC_SORT_SCORE,
        this.#routes.length,
        method,
        isMiddleware,
        path,
        emptyParam,
        handler,
      ])
      return
    }

    let sortScore: number = 0
    const params: string[] = []
    let ratio = 1

    const parts = path.split(/(:\w+)/)
    for (let i = 0, len = parts.length; i < len; i++) {
      if (parts[i].length === 0) {
        // skip
      } else if (parts[i][0] === ':') {
        params.push(parts[i].slice(1))
        parts[i] = '([^/]+)'
        sortScore += 1 * ratio
      } else {
        sortScore += parts[i].length
      }

      ratio /= MAX_PATH_LENGTH + 1
    }

    const regexpStr = parts.join('')
    this.#routes.push([
      isMiddleware ? sortScore + 0.01 * ratio : sortScore,
      this.#routes.length,
      method,
      isMiddleware,
      isMiddleware ? regexpStr : `${regexpStr}$`,
      params,
      handler,
    ])
  }

  match(method: string, path: string): Result<T> {
    const matchersWithHint: Record<string, MatcherWithHint<T>> = {}
    this.#routes
      .sort((a, b) => b[0] - a[0])
      .forEach((route) => {
        if (route[2] === METHOD_NAME_ALL) {
          addMatchers(matchersWithHint, METHOD_NAME_ALL, route)
          Object.keys(matchersWithHint).forEach((m) => {
            addMatchers(matchersWithHint, m, route)
          })
        } else {
          addMatchers(matchersWithHint, route[2], route)
        }
      })

    const matchers: Record<string, Matcher<T>> = Object.keys(matchersWithHint).reduce<
      Record<string, Matcher<T>>
    >((map, method) => {
      const matcher = matchersWithHint[method]
      map[method] = [
        new RegExp(matcher[0] || /^$/),
        matcher[3].map((d) => d && d.filter(Boolean)),
        Object.keys(matcher[4]).reduce<StaticMap<T>>((map, k) => {
          map[k] = [matcher[4][k][0].filter(Boolean) as HandlerData<T>, emptyParam]
          return map
        }, {}),
      ]
      return map
    }, {})
    matchers[METHOD_NAME_ALL] ||= [
      /^$/,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      0 as any, // never used
      emptyParamIndexMap,
    ]

    const match = (method: string, path: string): Result<T> => {
      const matcher = matchers[method] || matchers[METHOD_NAME_ALL]

      const staticMatch = matcher[2][path]
      if (staticMatch) {
        return staticMatch
      }

      const match = path.match(matcher[0])
      if (!match) {
        return [[], emptyParam]
      }

      const index = match.indexOf('', 1)
      return [matcher[1][index], match]
    }
    this.match = match
    return match(method, path)
  }
}
