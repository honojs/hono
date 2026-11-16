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
import {
  ONLY_WILDCARD_REG_EXP_STR,
  PATH_ERROR,
  PREFIXED_WILDCARD_REG_EXP_STR,
  TAIL_WILDCARD_REG_EXP_STR,
} from './node'
import { Trie } from './trie'

type HandlerWithMetadata<T> = [T, string] // [handler, path]

function endsWithWildcard(keys: string[]): boolean {
  const tail = keys[keys.length - 1]
  return tail === ONLY_WILDCARD_REG_EXP_STR || tail === TAIL_WILDCARD_REG_EXP_STR
}

// Whether `wildcard`, a branch ending with a wildcard, matches every request `target` matches:
// `wildcard` minus its wildcard is a prefix of `target`, and a `/*` also needs a boundary there.
function covers(wildcard: string[], target: string[]): boolean {
  const last = wildcard.length - 1
  for (let i = 0; i < last; i++) {
    if (wildcard[i] !== target[i]) {
      // `x*` right before the trailing `/*` may take nothing, so `/x*/*` also matches `/x`
      return i === last - 1 && wildcard[i] === PREFIXED_WILDCARD_REG_EXP_STR && target.length === i
    }
  }
  return (
    wildcard[last] === ONLY_WILDCARD_REG_EXP_STR || target.length === last || target[last] === '/'
  )
}

export class RegExpRouter<T> implements Router<T> {
  name: string = 'RegExpRouter'
  // method -> handlers in registration order; a method starts with a copy of ALL's
  #handlers?: Record<string, HandlerWithMetadata<T>[]>
  #tries?: Record<string, Trie>

  constructor() {
    this.#handlers = { [METHOD_NAME_ALL]: [] }
    this.#tries = { [METHOD_NAME_ALL]: new Trie() }
  }

  #insertPath(method: string, path: string) {
    try {
      this.#tries![method].insert(path, !/\*|\/:/.test(path))
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e
    }
  }

  add(method: string, path: string, handler: T) {
    const handlers = this.#handlers
    if (!handlers) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT)
    }

    const tries = this.#tries!
    if (!handlers[method]) {
      tries[method] = new Trie()
      handlers[method] = [...handlers[METHOD_NAME_ALL]]
      for (const p in tries[METHOD_NAME_ALL].paths) {
        this.#insertPath(method, p)
      }
    }

    if (path === '/*') {
      path = '*'
    }
    const methods = method === METHOD_NAME_ALL ? Object.keys(handlers) : [method]
    const paths = checkOptionalParameter(path) || [path]
    for (const path of paths) {
      for (const m of methods) {
        if (!tries[m].paths[path]) {
          this.#insertPath(m, path)
        }
        handlers[m].push([handler, path])
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

    // path -> indexes into `handlers`
    const own: Record<string, number[]> = createNullObject()
    const entries: HandlerData<T> = handlers.map(([h, p], i) => {
      ;(own[p] ??= []).push(i)
      return [
        h,
        trie.paths[p][1].reduceRight((map, [key, varIndex]) => {
          map[key] = paramReplacementMap[varIndex]
          return map
        }, createNullObject()),
      ]
    })
    const wildcards = Object.keys(own).filter((p) => endsWithWildcard(trie.paths[p][2]))

    for (const path in trie.paths) {
      const [index, , keys] = trie.paths[path]
      const indexes = [...own[path]]
      for (const p of wildcards) {
        if (p !== path && covers(trie.paths[p][2], keys)) {
          indexes.push(...own[p])
        }
      }
      const data: HandlerData<T> = indexes.sort((a, b) => a - b).map((i) => entries[i])
      if (index === -1) {
        // A static path can share literal nodes with parameter middleware such as /:id{a}/*.
        // Keep only the captures its handlers reference, as a plain array.
        const last = Math.max(-1, ...data.flatMap(([, map]) => Object.values(map)))
        staticMap[path] = [data, last === -1 ? emptyParam : path.match(regexp)!.slice(0, last + 1)]
      } else {
        handlerData[index] = data
      }
    }

    return [regexp, indexReplacementMap.map((i) => handlerData[i]), staticMap] as Matcher<T>
  }
}
