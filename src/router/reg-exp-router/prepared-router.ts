import type { Router, ParamIndexMap } from '../../router'
import { METHOD_NAME_ALL } from '../../router'
import type { Matcher, MatcherMap } from './matcher'
import { match, buildAllMatchersKey } from './matcher'
import { RegExpRouter } from './router'

type RelocateMap = Record<
  string,
  Record<
    string,
    [
      string, // method
      (number | string)[],
      ParamIndexMap | undefined
    ][]
  >
>

export class PreparedRegExpRouter<T> implements Router<T> {
  name: string = 'PreparedRegExpRouter'
  #matchers: MatcherMap<T>
  #relocateMap: RelocateMap

  constructor(matchers: MatcherMap<T>, relocateMap: RelocateMap) {
    this.#matchers = matchers
    this.#relocateMap = relocateMap
  }

  add(method: string, path: string, handler: T) {
    if (path === '/*' || path === '*') {
      const defaultHandlerData: [T, ParamIndexMap] = [handler, {}]
      ;(method === METHOD_NAME_ALL ? Object.keys(this.#matchers) : [method]).forEach((m) => {
        this.#matchers[m][1].forEach((list) => list && list.push(defaultHandlerData))
        Object.values(this.#matchers[m][2]).forEach((list) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          list[0].push(defaultHandlerData as any)
        )
      })
      return
    }

    const data = this.#relocateMap[method]?.[path]
    if (!data) {
      return
    }
    for (const [m, indexes, map] of data) {
      if (!map) {
        // assumed to be a static route
        this.#matchers[m][2][path][0].push([handler, {}])
      } else {
        indexes.forEach((index) => {
          if (typeof index === 'number') {
            this.#matchers[m][1][index].push([handler, map])
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.#matchers[m][2][index || path][0].push([handler, map as any])
          }
        })
      }
    }
  }

  [buildAllMatchersKey](): Record<string, Matcher<T>> {
    return this.#matchers
  }

  match: typeof match<Router<T>, T> = match
}

export const buildInitParams: (params: {
  routes: {
    method: string
    path: string
  }[]
}) => ConstructorParameters<typeof PreparedRegExpRouter> = ({ routes }) => {
  const router = new RegExpRouter<string>()
  for (const { method, path } of routes) {
    if (path === '/*' || path === '*') {
      continue
    }
    router.add(method.toUpperCase(), path, path)
  }

  const matchers = router[buildAllMatchersKey]()

  const all = matchers[METHOD_NAME_ALL]
  if (all) {
    for (const method of Object.keys(matchers)) {
      if (method === METHOD_NAME_ALL) {
        continue
      }

      if (
        matchers[method][0].toString() !== all[0].toString() ||
        JSON.stringify(matchers[method][1]) !== JSON.stringify(all[1]) ||
        JSON.stringify(matchers[method][2]) !== JSON.stringify(all[2])
      ) {
        continue
      }

      delete matchers[method]
    }
  }

  const relocateMap: RelocateMap = {}
  for (const { method, path } of routes) {
    if (method === METHOD_NAME_ALL) {
      Object.keys(matchers).forEach((m) => {
        matchers[m][1].forEach((list, i) => {
          list.forEach(([p, map]) => {
            if (p === path) {
              relocateMap[method] ||= {}
              relocateMap[method][path] ||= []
              let target = relocateMap[method][path].find(([method]) => method === m)
              if (!target) {
                target = [m, [], map]
                relocateMap[method][path].push(target)
              }
              if (target[1].findIndex((j) => j === i) === -1) {
                target[1].push(i)
              }
            }
          })
        })
        for (const path2 of Object.keys(matchers[m][2])) {
          matchers[m][2][path2][0].forEach(([p, map]) => {
            if (p === path) {
              relocateMap[method] ||= {}
              relocateMap[method][path] ||= []
              let target = relocateMap[method][path].find(([method]) => method === m)
              if (!target) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                target = [m, [], map as any]
                relocateMap[method][path].push(target)
              }
              const value = path2 === path ? '' : path2
              if (target[1].findIndex((v) => v === value) === -1) {
                target[1].push(value)
              }
            }
          })
        }
      })
    } else {
      const m = method.toUpperCase()
      matchers[m][1].forEach((list, i) => {
        list.forEach(([p, map]) => {
          if (p === path) {
            relocateMap[m] ||= {}
            relocateMap[m][path] ||= [[m, [], map]]
            if (relocateMap[m][path][0][1].findIndex((j) => j === i) === -1) {
              relocateMap[m][path][0][1].push(i)
            }
          }
        })
      })
      for (const path2 of Object.keys(matchers[m][2])) {
        matchers[m][2][path2][0].forEach(([p, map]) => {
          if (p === path) {
            relocateMap[m] ||= {}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            relocateMap[m][path] ||= [[m, [], map as any]]
            const value = path2 === path ? '' : path2
            if (relocateMap[m][path][0][1].findIndex((v) => v === value) === -1) {
              relocateMap[m][path][0][1].push(value)
            }
          }
        })
      }
    }
  }

  for (const method of Object.keys(matchers)) {
    if (matchers[method][1].length === 0 && Object.keys(matchers[method][2]).length === 0) {
      delete matchers[method]
      continue
    }

    for (let i = 0, len = matchers[method][1].length; i < len; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      matchers[method][1][i] = matchers[method][1][i] ? [] : (0 as any)
    }
    Object.keys(matchers[method][2]).forEach((path) => {
      matchers[method][2][path][0] = []
    })
  }

  return [matchers, relocateMap]
}

export const serializeInitParams: (
  params: ConstructorParameters<typeof PreparedRegExpRouter>
) => string = ([matchers, relocateMap]) => {
  for (const method of Object.keys(matchers)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(matchers[method][0] as any).toJSON = function () {
      return `@${this.toString()}@`
    }
  }
  const matchersStr = JSON.stringify(matchers).replace(/"@(.+?)@"/g, (_, str) =>
    str.replace(/\\\\/g, '\\')
  )
  const relocateMapStr = JSON.stringify(relocateMap)
  return `[${matchersStr},${relocateMapStr}]`
}
