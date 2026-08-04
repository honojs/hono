import type { ParamIndexMap, Router } from '../../router'
import {
  MESSAGE_MATCHER_IS_ALREADY_BUILT,
  METHOD_NAME_ALL,
  UnsupportedPathError,
} from '../../router'
import { checkOptionalParameter } from '../../utils/url'
import type { HandlerData, StaticMap, Matcher, MatcherMap } from './matcher'
import { match, emptyParam } from './matcher'
import { PATH_ERROR } from './node'
import { Trie } from './trie'

type HandlerWithMetadata<T> = [T, number] // [handler, paramCount]

let wildcardRegExpCache: Record<string, RegExp> = Object.create(null)
function buildWildcardRegExp(path: string): RegExp {
  return (wildcardRegExpCache[path] ??= new RegExp(
    path === '*'
      ? ''
      : `^${path.replace(/\/\*$|([.\\+*[^\]$()])/g, (_, metaChar) =>
          metaChar ? `\\${metaChar}` : '(?:|/.*)'
        )}$`
  ))
}

function clearWildcardRegExpCache() {
  wildcardRegExpCache = Object.create(null)
}

function findMiddleware<T>(
  middleware: Record<string, T[]> | undefined,
  path: string
): T[] | undefined {
  if (!middleware) {
    return undefined
  }

  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]]
    }
  }

  return undefined
}

export class RegExpRouter<T> implements Router<T> {
  name: string = 'RegExpRouter'
  #middleware?: Record<string, Record<string, HandlerWithMetadata<T>[]>>
  #routes?: Record<string, Record<string, HandlerWithMetadata<T>[]>>
  #tries?: Record<string, Trie>

  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: Object.create(null) }
    this.#routes = { [METHOD_NAME_ALL]: Object.create(null) }
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
    const middleware = this.#middleware
    const routes = this.#routes

    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT)
    }

    if (!middleware[method]) {
      this.#tries![method] = new Trie()
      ;[middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = Object.create(null)
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]]
          this.#insertPath(method, p)
        })
      })
    }

    if (path === '/*') {
      path = '*'
    }

    const paramCount = (path.match(/\/:/g) || []).length

    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path)
      Object.keys(middleware).forEach((m) => {
        if ((method === METHOD_NAME_ALL || method === m) && !middleware[m][path]) {
          this.#insertPath(m, path)
          middleware[m][path] =
            findMiddleware(middleware[m], path) ||
            findMiddleware(middleware[METHOD_NAME_ALL], path) ||
            []
        }
      })
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount])
          })
        }
      })

      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          )
        }
      })

      return
    }

    const paths = checkOptionalParameter(path) || [path]
    for (let i = 0, len = paths.length; i < len; i++) {
      const path = paths[i]

      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          if (!routes[m][path]) {
            this.#insertPath(m, path)
            routes[m][path] = [
              ...(findMiddleware(middleware[m], path) ||
                findMiddleware(middleware[METHOD_NAME_ALL], path) ||
                []),
            ]
          }
          routes[m][path].push([handler, paramCount - len + i + 1])
        }
      })
    }
  }

  match: typeof match<Router<T>, T> = match

  protected buildAllMatchers(): MatcherMap<T> {
    const matchers: MatcherMap<T> = Object.create(null)

    Object.keys(this.#routes!)
      .concat(Object.keys(this.#middleware!))
      .forEach((method) => {
        matchers[method] ||= this.#buildMatcher(method)
      })

    // Release cache
    this.#middleware = this.#routes = this.#tries = undefined
    clearWildcardRegExpCache()

    return matchers
  }

  #buildMatcher(method: string): Matcher<T> {
    const middleware = this.#middleware![method]
    const routes = this.#routes![method]

    const trie = this.#tries![method]
    const staticMap: StaticMap<T> = Object.create(null)
    const handlerData: HandlerData<T>[] = []

    ;[middleware, routes].forEach((r) => {
      for (const path in r) {
        const handlers = r[path]
        const pathData = trie.paths[path]
        if (!pathData) {
          staticMap[path] = [handlers.map(([h]) => [h, Object.create(null)]), emptyParam]
          continue
        }
        const paramAssoc = pathData[1]
        handlerData[pathData[0]] = handlers.map(([h, paramCount]) => {
          const paramIndexMap: ParamIndexMap = Object.create(null)
          paramCount -= 1
          for (; paramCount >= 0; paramCount--) {
            const [key, value] = paramAssoc[paramCount]
            paramIndexMap[key] = value
          }
          return [h, paramIndexMap]
        })
      }
    })

    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp()
    for (let i = 0, len = handlerData.length; i < len; i++) {
      for (let j = 0, len = handlerData[i].length; j < len; j++) {
        const map = handlerData[i][j]?.[1]
        if (!map) {
          continue
        }
        const keys = Object.keys(map)
        for (let k = 0, len = keys.length; k < len; k++) {
          map[keys[k]] = paramReplacementMap[map[keys[k]]]
        }
      }
    }

    const handlerMap: HandlerData<T>[] = []
    // using `in` because indexReplacementMap is a sparse array
    for (const i in indexReplacementMap) {
      handlerMap[i] = handlerData[indexReplacementMap[i]]
    }

    return [regexp, handlerMap, staticMap] as Matcher<T>
  }
}
