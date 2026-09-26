import type { ParamIndexMap, Result, Router } from '../../router'
import { METHOD_NAME_ALL } from '../../router'
import type { HandlerData, Matcher, MatcherMap, StaticMap } from './matcher'
import { match } from './matcher'
import { RegExpRouter } from './router'

type Relocation = [(number | string)[], ParamIndexMap]
type RelocateMap = Record<string, Relocation[]>

export class PreparedRegExpRouter<T> implements Router<T> {
  name: string = 'PreparedRegExpRouter'
  #matchers: MatcherMap<T>
  #relocateMap: RelocateMap

  constructor(matchers: MatcherMap<T>, relocateMap: RelocateMap) {
    this.#matchers = matchers
    this.#relocateMap = relocateMap
  }

  #addWildcard(method: string, handlerData: [T, ParamIndexMap]) {
    const matcher = this.#matchers[method] as Matcher<T>
    matcher[1].forEach((list) => list && list.push(handlerData))
    Object.values(matcher[2]).forEach((list) => (list[0] as [T, ParamIndexMap][]).push(handlerData))
  }

  #addPath(method: string, path: string, handler: T, [indexes, map]: Relocation) {
    const matcher = this.#matchers[method] as Matcher<T>
    indexes.forEach((index) => {
      if (typeof index === 'number') {
        matcher[1][index].push([handler, map])
      } else {
        ;(matcher[2][index || path][0] as [T, ParamIndexMap][]).push([handler, map])
      }
    })
  }

  add(method: string, path: string, handler: T) {
    if (!this.#matchers[method]) {
      const all = this.#matchers[METHOD_NAME_ALL] as Matcher<T>
      const staticMap = {} as StaticMap<T>
      for (const key in all[2]) {
        staticMap[key] = [all[2][key][0].slice(), all[2][key][1]] as Result<T>
      }
      this.#matchers[method] = [
        all[0],
        all[1].map((list) => (Array.isArray(list) ? list.slice() : 0)) as HandlerData<T>[],
        staticMap,
      ]
    }

    if (path === '/*' || path === '*') {
      const handlerData: [T, ParamIndexMap] = [handler, {}]
      if (method === METHOD_NAME_ALL) {
        for (const m in this.#matchers) {
          this.#addWildcard(m, handlerData)
        }
      } else {
        this.#addWildcard(method, handlerData)
      }
      return
    }

    const data = this.#relocateMap[path]
    if (!data) {
      throw new Error(`Path ${path} is not registered`)
    }
    for (const relocation of data) {
      if (method === METHOD_NAME_ALL) {
        for (const m in this.#matchers) {
          this.#addPath(m, path, handler, relocation)
        }
      } else {
        this.#addPath(method, path, handler, relocation)
      }
    }
  }

  protected buildAllMatchers(): MatcherMap<T> {
    return this.#matchers
  }

  match: typeof match<Router<T>, T> = match
}

export const buildInitParams: (params: {
  paths: string[]
}) => ConstructorParameters<typeof PreparedRegExpRouter> = ({ paths }) => {
  const RegExpRouterWithMatcherExport = class<T> extends RegExpRouter<T> {
    buildAndExportAllMatchers() {
      return this.buildAllMatchers()
    }
  }
  const router = new RegExpRouterWithMatcherExport<string>()
  for (const path of paths) {
    router.add(METHOD_NAME_ALL, path, path)
  }

  const matchers = router.buildAndExportAllMatchers()
  const all = matchers[METHOD_NAME_ALL] as Matcher<string>

  const relocateMap: RelocateMap = {}
  for (const path of new Set(paths)) {
    if (path === '/*' || path === '*') {
      continue
    }
    // one relocation per param map; optional params and compacted static routes give a handler several
    const relocations = new Map<string, Relocation>()
    const relocate = (map: ParamIndexMap, index: number | string) => {
      const key = JSON.stringify(map)
      let relocation = relocations.get(key)
      if (!relocation) {
        relocation = [[], map]
        relocations.set(key, relocation)
        ;(relocateMap[path] ||= []).push(relocation)
      }
      if (relocation[0].indexOf(index) === -1) {
        relocation[0].push(index)
      }
    }
    all[1].forEach((list, i) => {
      list.forEach(([p, map]) => {
        if (p === path) {
          relocate(map, i)
        }
      })
    })
    for (const path2 in all[2]) {
      const entry = all[2][path2][0].find(([p]) => p === path)
      if (entry) {
        relocate(entry[1] as ParamIndexMap, path2 === path ? '' : path2)
      }
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
  // Embed the regular expression as a result of `toString()` so that it can be evaluated as JavaScript.
  const matchersStr = JSON.stringify(matchers, (_, value) =>
    value instanceof RegExp ? `##${value.toString()}##` : value
  ).replace(/"##(.+?)##"/g, (_, str) => str.replace(/\\\\/g, '\\'))
  const relocateMapStr = JSON.stringify(relocateMap)
  return `[${matchersStr},${relocateMapStr}]`
}
