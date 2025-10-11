import type { ParamIndexMap, Result, Router } from '../../router'
import { METHOD_NAME_ALL } from '../../router'
import type { HandlerData, Matcher, MatcherMap, StaticMap } from './matcher'
import { match, buildAllMatchersKey, emptyParam } from './matcher'
import { RegExpRouter } from './router'

type RelocateMap = Record<string, [(number | string)[], ParamIndexMap | undefined][]>

export class PreparedRegExpRouter<T> implements Router<T> {
  name: string = 'PreparedRegExpRouter'
  #matchers: MatcherMap<T>
  #relocateMap: RelocateMap

  constructor(matchers: MatcherMap<T>, relocateMap: RelocateMap) {
    this.#matchers = matchers
    this.#relocateMap = relocateMap
  }

  add(method: string, path: string, handler: T) {
    const all = this.#matchers[METHOD_NAME_ALL] as Matcher<T>
    this.#matchers[method] ||= [
      all[0],
      all[1].map((list) => (Array.isArray(list) ? list.slice() : 0)) as HandlerData<T>[],
      Object.keys(all[2]).reduce((obj, key) => {
        obj[key] = [all[2][key][0].slice(), emptyParam] as Result<T>
        return obj
      }, {} as StaticMap<T>),
    ]

    if (path === '/*' || path === '*') {
      const defaultHandlerData: [T, ParamIndexMap] = [handler, {}]
      ;(method === METHOD_NAME_ALL ? Object.keys(this.#matchers) : [method]).forEach((m) => {
        const matcher = this.#matchers[m]
        if (!matcher) {
          return
        }
        matcher[1].forEach((list) => list && list.push(defaultHandlerData))
        Object.values(matcher[2]).forEach((list) =>
          (list[0] as [T, ParamIndexMap][]).push(defaultHandlerData)
        )
      })
      return
    }

    const data = this.#relocateMap[path]
    if (!data) {
      throw new Error(`Path ${path} is not registered`)
    }
    for (const [indexes, map] of data) {
      ;(method === METHOD_NAME_ALL ? Object.keys(this.#matchers) : [method]).forEach((m) => {
        const matcher = this.#matchers[m]
        if (!matcher) {
          return
        }
        if (!map) {
          // assumed to be a static route
          matcher[2][path][0].push([handler, {}])
        } else {
          indexes.forEach((index) => {
            if (typeof index === 'number') {
              matcher[1][index].push([handler, map])
            } else {
              ;(matcher[2][index || path][0] as [T, ParamIndexMap][]).push([handler, map])
            }
          })
        }
      })
    }
  }

  [buildAllMatchersKey](): MatcherMap<T> {
    return this.#matchers
  }

  match: typeof match<Router<T>, T> = match
}

export const buildInitParams: (params: {
  paths: string[]
}) => ConstructorParameters<typeof PreparedRegExpRouter> = ({ paths }) => {
  const router = new RegExpRouter<string>()
  for (const path of paths) {
    router.add(METHOD_NAME_ALL, path, path)
  }

  const matchers = router[buildAllMatchersKey]()
  const all = matchers[METHOD_NAME_ALL] as Matcher<string>
  for (const method in matchers) {
    if (method !== METHOD_NAME_ALL) {
      delete matchers[method]
    }
  }

  const relocateMap: RelocateMap = {}
  for (const path of paths) {
    all[1].forEach((list, i) => {
      list.forEach(([p, map]) => {
        if (p === path) {
          if (relocateMap[path]) {
            relocateMap[path][0][1] = {
              ...relocateMap[path][0][1],
              ...map,
            }
          } else {
            relocateMap[path] = [[[], map]]
          }
          if (relocateMap[path][0][0].findIndex((j) => j === i) === -1) {
            relocateMap[path][0][0].push(i)
          }
        }
      })
    })
    for (const path2 in all[2]) {
      all[2][path2][0].forEach(([p]) => {
        if (p === path) {
          relocateMap[path] ||= [[[], undefined]]
          const value = path2 === path ? '' : path2
          if (relocateMap[path][0][0].findIndex((v) => v === value) === -1) {
            relocateMap[path][0][0].push(value)
          }
        }
      })
    }
  }

  for (let i = 0, len = all[1].length; i < len; i++) {
    all[1][i] = all[1][i] ? [] : (0 as unknown as HandlerData<string>)
  }
  for (const path in all[2]) {
    all[2][path][0] = []
  }

  return [matchers, relocateMap]
}

export const serializeInitParams: (
  params: ConstructorParameters<typeof PreparedRegExpRouter>
) => string = ([matchers, relocateMap]) => {
  for (const method in matchers) {
    const matcher = matchers[method] as Matcher<string>
    // escape the regular expression to serialize it with `JSON.stringify`
    ;(matcher[0] as RegExp & { toJSON: () => string }).toJSON = function () {
      return `@${this.toString()}@`
    }
  }
  // unescape the regular expression so that it can be deserialized with `eval`.
  const matchersStr = JSON.stringify(matchers).replace(/"@(.+?)@"/g, (_, str) =>
    str.replace(/\\\\/g, '\\')
  )
  const relocateMapStr = JSON.stringify(relocateMap)
  return `[${matchersStr},${relocateMapStr}]`
}
