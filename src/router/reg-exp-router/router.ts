import type { Router } from '../../router'
import {
  MESSAGE_MATCHER_IS_ALREADY_BUILT,
  METHOD_NAME_ALL,
  UnsupportedPathError,
} from '../../router'
import { checkOptionalParameter } from '../../utils/url'
import { createNullObject } from '../utils'
import type { HandlerData, StaticMap, Matcher, MatcherMap } from './matcher'
import { match, emptyParam } from './matcher'
import { PATH_ERROR } from './node'
import { Trie } from './trie'

type HandlerWithMetadata<T> = [T, string] // [handler, path]

export class RegExpRouter<T> implements Router<T> {
  name: string = 'RegExpRouter'
  // method -> handlers in registration order
  #handlers?: Record<string, HandlerWithMetadata<T>[]>
  #tries?: Record<string, Trie>

  constructor() {
    this.#handlers = { [METHOD_NAME_ALL]: [] }
    this.#tries = { [METHOD_NAME_ALL]: new Trie() }
  }

  #insertPath(method: string, path: string) {
    const trie = this.#tries![method]
    if (trie.has(path)) {
      return
    }
    try {
      trie.insert(path, !/\*|\/:/.test(path))
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e
    }
  }

  add(method: string, path: string, handler: T) {
    const handlers = this.#handlers

    if (!handlers) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT)
    }

    // Wildcards cannot match line terminators.
    if (/[\r\n\u2028\u2029]/.test(path)) {
      throw new UnsupportedPathError(path)
    }

    if (!handlers[method]) {
      this.#tries![method] = new Trie()
      handlers[method] = []
      for (const [h, p] of handlers[METHOD_NAME_ALL]) {
        this.#insertPath(method, p)
        handlers[method].push([h, p])
      }
    }

    if (path === '/*') {
      path = '*'
    }
    const methods = method === METHOD_NAME_ALL ? Object.keys(handlers) : [method]

    for (const p of checkOptionalParameter(path) || [path]) {
      for (const m of methods) {
        this.#insertPath(m, p)
        handlers[m].push([handler, p])
      }
    }
  }

  match: typeof match<Router<T>, T> = match

  protected buildAllMatchers(): MatcherMap<T> {
    const matchers: MatcherMap<T> = createNullObject()

    for (const method of Object.keys(this.#handlers!)) {
      matchers[method] = this.#buildMatcher(method)
    }

    // Release cache
    this.#handlers = this.#tries = undefined

    return matchers
  }

  #buildMatcher(method: string): Matcher<T> {
    const handlers = this.#handlers![method]
    const trie = this.#tries![method]
    const staticMap: StaticMap<T> = createNullObject()
    const handlerData: HandlerData<T>[] = []
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp()

    // handler position -> [handler, param map], shared by every path the handler is attached to
    const entries: HandlerData<T> = handlers.map(([handler, path]) => [
      handler,
      (trie.paths[path]?.[1] || []).reduceRight((map, [key, paramIndex]) => {
        map[key] = paramReplacementMap[paramIndex]
        return map
      }, createNullObject()),
    ])
    // path -> positions of its own handlers; positions of wildcard handlers
    const indexes: Record<string, number[]> = createNullObject()
    const wildcards: number[] = []
    handlers.forEach(([, path], i) => {
      ;(indexes[path] ||= []).push(i)
      if (trie.isWildcard(path)) {
        wildcards.push(i)
      }
    })

    for (const path in indexes) {
      const matched = [
        ...indexes[path],
        ...wildcards.filter((i) => handlers[i][1] !== path && trie.covers(handlers[i][1], path)),
      ]
        .sort((a, b) => a - b)
        .map((i) => entries[i])
      const pathData = trie.paths[path]
      if (!pathData) {
        const hasParams = matched.some(([, params]) => Object.keys(params).length > 0)
        if (!hasParams) {
          staticMap[path] = [matched, emptyParam]
          continue
        }
        // Keep only the captures used by this static route's middleware.
        const captures = path.match(regexp)!
        const params: string[] = []
        const replacements = new Map<number, number>()
        const staticHandlers: HandlerData<T> = matched.map((entry) => {
          const keys = Object.keys(entry[1])
          if (keys.length === 0) {
            return entry
          }
          const map = createNullObject()
          for (const key of keys) {
            const index = entry[1][key]
            let replacement = replacements.get(index)
            if (replacement === undefined) {
              replacement = params.length
              replacements.set(index, replacement)
              params.push(captures[index])
            }
            map[key] = replacement
          }
          return [entry[0], map]
        })
        staticMap[path] = [staticHandlers, params]
        continue
      }
      handlerData[pathData[0]] = matched
    }

    return [regexp, indexReplacementMap.map((i) => handlerData[i]), staticMap] as Matcher<T>
  }
}
