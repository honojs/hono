/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { Router, Result, ParamIndexMap } from '../../router'
import {
  METHOD_NAME_ALL,
  UnsupportedPathError,
  MESSAGE_MATCHER_IS_ALREADY_BUILT,
} from '../../router'
import { checkOptionalParameter } from '../../utils/url'
import { PATH_ERROR, type ParamAssocArray } from './node'
import { Trie } from './trie'

type HandlerData<T> = [T, ParamIndexMap][]
type StaticMap<T> = Record<string, Result<T>>
type Matcher<T> = [RegExp, HandlerData<T>[], StaticMap<T>]
type HandlerWithMetadata<T> = [T, number] // [handler, paramCount]

const emptyParam: string[] = []
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nullMatcher: Matcher<any> = [/^$/, [], {}]

let wildcardRegExpCache: Record<string, RegExp> = {}
function buildWildcardRegExp(path: string): RegExp {
  return (wildcardRegExpCache[path] ??= new RegExp(
    path === '*' ? '' : `^${path.replace(/\/\*/, '(?:|/.*)')}$`
  ))
}

function clearWildcardRegExpCache() {
  wildcardRegExpCache = {}
}

function buildMatcherFromPreprocessedRoutes<T>(
  routes: [string, HandlerWithMetadata<T>[]][]
): Matcher<T> {
  const trie = new Trie()
  const handlerData: HandlerData<T>[] = []
  if (routes.length === 0) {
    return nullMatcher
  }

  const routesWithStaticPathFlag = routes
    .map(
      (route) => [!/\*|\/:/.test(route[0]), ...route] as [boolean, string, HandlerWithMetadata<T>[]]
    )
    .sort(([isStaticA, pathA], [isStaticB, pathB]) =>
      isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
    )

  const staticMap: StaticMap<T> = {}
  for (let i = 0, j = -1, { length } = routesWithStaticPathFlag; i < length; ++i) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i]
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, {}]), emptyParam]
    } else {
      j++
    }

    let paramAssoc: ParamAssocArray
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly)
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e
    }

    if (pathErrorCheckOnly) {
      continue
    }

    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap: ParamIndexMap = {}
      paramCount -= 1
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount]
        paramIndexMap[key] = value
      }
      return [h, paramIndexMap]
    })
  }

  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp()
  for (let i = 0, { length } = handlerData; i < length; ++i) {
    for (let j = 0, { length } = handlerData[i]; j < length; ++j) {
      const map = handlerData[i][j]?.[1]
      if (typeof map === 'undefined') {
        continue
      }
      
      const keys = Object.keys(map);
      for (let k = 0, { length } = keys; k < length; ++k) {
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

function findMiddleware<T>(
  middleware: Record<string, T[]> | undefined,
  path: string
): T[] | undefined {
  if (typeof middleware !== 'undefined') {
    for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
      if (buildWildcardRegExp(k).test(path)) {
        return [...middleware[k]]
      }
    }
  }
}

export class RegExpRouter<T> implements Router<T> {
  name: string = 'RegExpRouter'
  middleware?: Record<string, Record<string, HandlerWithMetadata<T>[]>>
  routes?: Record<string, Record<string, HandlerWithMetadata<T>[]>>

  constructor() {
    this.middleware = { [METHOD_NAME_ALL]: {} }
    this.routes = { [METHOD_NAME_ALL]: {} }
  }

  add(method: string, path: string, handler: T) {
    const { middleware, routes } = this

    if (typeof middleware === 'undefined' || typeof routes === 'undefined') {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT)
    }

    if (typeof middleware[method] === 'undefined') {
      ;[middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = {}
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]]
        })
      })
    }

    if (path === '/*') {
      path = '*'
    }

    const paramCount = (path.match(/\/:/g) ?? []).length

    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path)
      if (method === METHOD_NAME_ALL) {
        for (const m in middleware) {
          middleware[m][path] ??=
            findMiddleware(middleware[m], path) ??
            findMiddleware(middleware[METHOD_NAME_ALL], path) ??
            []
        }
      } else {
        middleware[method][path] ??=
          findMiddleware(middleware[method], path) ??
          findMiddleware(middleware[METHOD_NAME_ALL], path) ??
          []
      }

      for (const m in middleware) {
        if (method === METHOD_NAME_ALL || method === m) {
          const currentMiddleware = middleware[m];

          for (const p in currentMiddleware) {
            if (re.test(p)) {
              currentMiddleware[p].push([handler, paramCount]);
            }
          }
        }
      }

      for (const m in routes) {
        if (method === METHOD_NAME_ALL || method === m) {
          const currentRoutes = routes[m];

          for (const p in currentRoutes) {
            if (re.test(p)) {
              currentRoutes[p].push([handler, paramCount]);
            }
          }
        }
      }

      return
    }

    const paths = checkOptionalParameter(path) ?? [path]
    for (let i = 0, { length } = paths; i < length; i++) {
      const path = paths[i]

      for (const currentMethod in routes) {
        if (method === METHOD_NAME_ALL || method === currentMethod) {
          routes[currentMethod][path] ??= [
            ...(findMiddleware(middleware[currentMethod], path) ??
              findMiddleware(middleware[METHOD_NAME_ALL], path) ??
              []),
          ]
          routes[currentMethod][path].push([handler, paramCount - length + i + 1])
        }
      }
    }
  }

  match(method: string, path: string): Result<T> {
    clearWildcardRegExpCache() // no longer used.

    const matchers = this.buildAllMatchers();

    this.match = (method, path) => {
      const matcher = (matchers[method] ?? matchers[METHOD_NAME_ALL]) as Matcher<T>

      const staticMatch = matcher[2][path]
      if (typeof staticMatch !== 'undefined') {
        return staticMatch
      }

      const match = path.match(matcher[0])
      if (match === null) {
        return [[], emptyParam]
      }
      
      return [matcher[1][match.indexOf('', 1)], match]
    }

    return this.match(method, path);
  }

  private buildAllMatchers(): Record<string, Matcher<T> | null> {
    const matchers: Record<string, Matcher<T> | null> = {}

    for (const method in this.routes!) {
      matchers[method] ??= this.buildMatcher(method)
    }
    for (const method in this.middleware!) {
      matchers[method] ??= this.buildMatcher(method)
    }

    // Release cache
    this.middleware = this.routes = undefined

    return matchers
  }

  private buildMatcher(method: string): Matcher<T> | null {
    const routes: [string, HandlerWithMetadata<T>[]][] = []

    let hasOwnRoute = method === METHOD_NAME_ALL
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ;[this.middleware!, this.routes!].forEach((r) => {
      const ownRoute = r[method]
        ? Object.keys(r[method]).map((path) => [path, r[method][path]])
        : []
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true
        routes.push(...(ownRoute as [string, HandlerWithMetadata<T>[]][]))
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...(Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]]) as [
            string,
            HandlerWithMetadata<T>[]
          ][])
        )
      }
    })

    if (!hasOwnRoute) {
      return null
    } else {
      return buildMatcherFromPreprocessedRoutes(routes)
    }
  }
}
