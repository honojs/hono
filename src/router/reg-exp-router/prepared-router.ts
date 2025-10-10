import type { Result, Router, ParamIndexMap } from '../../router'
import { METHOD_NAME_ALL } from '../../router'
import type { Matcher, MatcherMap } from './matcher'
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
    const all = this.#matchers[METHOD_NAME_ALL]
    this.#matchers[method] ||= [
      all[0],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      all[1].map((list) => (Array.isArray(list) ? list.slice() : 0)) as any,
      Object.keys(all[2]).reduce((obj, key) => {
        obj[key] = [all[2][key][0].slice(), emptyParam]
        return obj
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, {} as any),
    ]

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

    const data = this.#relocateMap[path]
    if (!data) {
      return
    }
    for (const [indexes, map] of data) {
      ;(method === METHOD_NAME_ALL ? Object.keys(this.#matchers) : [method]).forEach((m) => {
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
      })
    }
  }

  [buildAllMatchersKey](): Record<string, Matcher<T>> {
    return this.#matchers
  }

  match: typeof match<Router<T>, T> = match
}

export const buildInitParams: (params: {
  paths: string[]
}) => ConstructorParameters<typeof PreparedRegExpRouter> = ({ paths }) => {
  const router = new RegExpRouter<string>()
  for (const path of paths) {
    if (path === '/*' || path === '*') {
      continue
    }
    router.add(METHOD_NAME_ALL, path, path)
  }

  const matchers = router[buildAllMatchersKey]()
  const all = matchers[METHOD_NAME_ALL]
  Object.keys(matchers).forEach((method) => {
    if (method !== METHOD_NAME_ALL) {
      delete matchers[method]
    }
  })

  const relocateMap: RelocateMap = {}
  for (const path of paths) {
    all[1].forEach((list, i) => {
      list.forEach(([p, map]) => {
        if (p === path) {
          relocateMap[path] ||= [[[], map]]
          if (relocateMap[path][0][0].findIndex((j) => j === i) === -1) {
            relocateMap[path][0][0].push(i)
          }
        }
      })
    })
    for (const path2 of Object.keys(all[2])) {
      all[2][path2][0].forEach(([p, map]) => {
        if (p === path) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          relocateMap[path] ||= [[[], map as any]]
          const value = path2 === path ? '' : path2
          if (relocateMap[path][0][0].findIndex((v) => v === value) === -1) {
            relocateMap[path][0][0].push(value)
          }
        }
      })
    }
  }

  for (let i = 0, len = all[1].length; i < len; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all[1][i] = all[1][i] ? [] : (0 as any)
  }
  Object.keys(all[2]).forEach((path) => {
    all[2][path][0] = []
  })

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
