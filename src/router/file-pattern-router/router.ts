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
    if (matchersWithHint[METHOD_NAME_ALL]) {
      const template = matchersWithHint[METHOD_NAME_ALL]
      matchersWithHint[method] = [
        template[0],
        template[1],
        { ...template[2] },
        [...template[3]],
        {},
      ]
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      matchersWithHint[method] = ['', 0, [] as any, [], {}]
    }
  }
  const matcher = matchersWithHint[method]
  if (params.length === 0 && !isMiddleware) {
    ;(matcher[4][regexpStr] ||= [[], emptyParam] as Result<T>)[0].push([
      handler,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emptyParam as any,
    ])
    return
  }

  if (matcher[2][regexpStr]) {
    const handlerData = matcher[3][matcher[2][regexpStr]]
    handlerData[index] = [handler, handlerData[0][1]]
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
                map[param] = handlerData[0][1][param]
                return map
              }, {})
        handlerData[index] = [handler, paramIndexMap]
      }
    })
    Object.keys(matcher[4]).forEach((k) => {
      if (k.startsWith(regexpStr)) {
        ;(matcher[4][k][0] as [[T, ParamIndexMap]]).push([handler, emptyParamIndexMap])
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

    if (path.indexOf(':') !== -1) {
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

    const parts = path.split(/(:\w+)/)
    for (let i = 0, len = parts.length, ratio = 1; i < len; i++, ratio /= MAX_PATH_LENGTH + 1) {
      if (parts[i][0] === ':') {
        params.push(parts[i].slice(1))
        parts[i] = '/([^/]+)'
        sortScore += MAX_PATH_LENGTH * ratio
      } else {
        sortScore += (parts[i].length + (isMiddleware ? 0.01 : 0)) * ratio
      }
    }

    const regexpStr = parts.join('')
    this.#routes.push([
      sortScore,
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
          const methods = Object.keys(matchersWithHint)
          if (methods.length === 0) {
            addMatchers(matchersWithHint, METHOD_NAME_ALL, route)
          } else {
            methods.forEach((m) => {
              addMatchers(matchersWithHint, m, route)
            })
          }
        } else {
          addMatchers(matchersWithHint, route[2], route)
        }
      })

    const matchers: Record<string, Matcher<T>> = Object.keys(matchersWithHint).reduce<
      Record<string, Matcher<T>>
    >((map, method) => {
      const matcher = matchersWithHint[method]
      map[method] = [new RegExp(matcher[0]), matcher[3].map((d) => d.filter(Boolean)), matcher[4]]
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
