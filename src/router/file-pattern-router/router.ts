import type { Result, Router, ParamIndexMap } from '../../router'
import { METHOD_NAME_ALL } from '../../router'

const MAX_PATH_LENGTH = 99
const STATIC_SORT_SCORE = MAX_PATH_LENGTH + 1
const emptyParam: string[] = []
const emptyParamIndexMap = {}

type HandlerData<T> = [T, ParamIndexMap][]
type StaticMap<T> = Record<string, Result<T>>
type MatcherWithHint<T> = [
  string | RegExp,
  HandlerData<T>[],
  StaticMap<T>,
  number,
  Record<string, number>
]
type Matcher<T> = [RegExp, HandlerData<T>[], StaticMap<T>]

type Route<T> = [number, number, string, boolean, string, string[], T] // [sortScore, index, method, isMiddleware, regexpStr, params]

function addMatchers<T>(
  matchersWithHint: Record<string, MatcherWithHint<T>>,
  method: string,
  [, index, , isMiddleware, regexpStr, params, handler]: Route<T>
) {
  const skipRegister = method === METHOD_NAME_ALL && matchersWithHint[METHOD_NAME_ALL]

  if (!matchersWithHint[method]) {
    // new method
    if (matchersWithHint[METHOD_NAME_ALL]) {
      const template = matchersWithHint[METHOD_NAME_ALL]
      matchersWithHint[method] = [
        template[0],
        [...template[1]],
        Object.keys(template[2]).reduce<StaticMap<T>>((map, k) => {
          map[k] = [template[2][k][0].slice() as HandlerData<T>, emptyParam]
          return map
        }, {}),
        template[3],
        { ...template[4] },
      ]
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      matchersWithHint[method] = ['', [], {}, 0, {}]
    }
  }
  const matcher = matchersWithHint[method]
  if (!skipRegister) {
    if (params.length === 0 && !isMiddleware) {
      // static routes
      const handlers = []
      handlers[index] = [handler, emptyParamIndexMap]
      matcher[2][regexpStr] ||= [handlers, emptyParam] as Result<T>
      return
    }

    if (matcher[4][regexpStr]) {
      // already registered with the same routing
      const handlerData = matcher[1][matcher[4][regexpStr]]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handlerData[index] = [handler, handlerData.find(Boolean)?.[1] as any]
    } else {
      const handlerData = []
      handlerData[index] = [
        handler,
        params.length === 0
          ? emptyParamIndexMap
          : params.reduce<Record<string, number>>((map, param) => {
              map[param] = ++matcher[3]
              return map
            }, {}),
      ]
      matcher[1][(matcher[4][regexpStr] = ++matcher[3])] = handlerData as HandlerData<T>
      matcher[0] += `${(matcher[0] as string).length === 0 ? '^' : '|'}${regexpStr}()`
    }
  }

  if (isMiddleware) {
    // search for existing handlers with forward matching and add handlers to those that match
    Object.keys(matcher[4]).forEach((k) => {
      if (k === regexpStr) {
        // already added for myself
        return
      }
      if (k.startsWith(regexpStr)) {
        const handlerData = matcher[1][matcher[4][k]]
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
    Object.keys(matcher[2]).forEach((k) => {
      if (k.startsWith(regexpStr)) {
        ;(matcher[2][k][0] as [[T, ParamIndexMap]])[index] = [handler, emptyParamIndexMap]
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

  private buildMatcher(
    matchers: Record<string, MatcherWithHint<T>>,
    method: string
  ): MatcherWithHint<T> {
    this.#routes
      .sort((a, b) => b[0] - a[0])
      .forEach((route) => {
        if (route[2] === METHOD_NAME_ALL) {
          addMatchers(matchers, METHOD_NAME_ALL, route)
          addMatchers(matchers, method, route)
        } else if (route[2] === method) {
          addMatchers(matchers, method, route)
        }
      })

    /* eslint-disable @typescript-eslint/no-explicit-any */
    if (matchers[method]) {
      // force convert MatcherWithHint<T> to Matcher<T>
      matchers[method][0] = new RegExp(matchers[method][0] || '^$') as any
      matchers[method][1].forEach((v, i) => {
        matchers[method][1][i] = v?.filter(Boolean)
      })
      Object.keys(matchers[method][2]).forEach((k) => {
        matchers[method][2][k][0] = (matchers[method][2][k][0] as any).filter(Boolean) as any
      })
    } else {
      matchers[method] = matchers[METHOD_NAME_ALL] || ([/^$/, 0, {}] as any)
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return matchers[method]
  }

  match(method: string, path: string): Result<T> {
    const matchers: Record<string, MatcherWithHint<T>> = {}
    const match = (method: string, path: string): Result<T> => {
      const matcher = (matchers[method] ||
        this.buildMatcher(matchers, method)) as unknown as Matcher<T>

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
