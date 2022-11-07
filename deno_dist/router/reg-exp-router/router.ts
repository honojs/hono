/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { Router, Result } from '../../router.ts'
import { METHOD_NAME_ALL, METHODS, UnsupportedPathError } from '../../router.ts'
import { checkOptionalParameter } from '../../utils/url.ts'
import { PATH_ERROR } from './node.ts'
import type { ParamMap } from './trie.ts'
import { Trie } from './trie.ts'

const methodNames = [METHOD_NAME_ALL, ...METHODS].map((method) => method.toUpperCase())

type HandlerData<T> = [T[], ParamMap | null]
type Matcher<T> = [RegExp, HandlerData<T>[]]

const emptyParam = {}
const nullMatcher: Matcher<any> = [/^$/, []]

function buildWildcardRegExp(path: string): RegExp {
  return new RegExp(path === '*' ? '' : `^${path.replace(/\/\*/, '(?:|/.*)')}$`)
}

function buildMatcherFromPreprocessedRoutes<T>(routes: [string, T[]][]): Matcher<T> {
  const trie = new Trie()
  const handlers: HandlerData<T>[] = []
  if (routes.length === 0) {
    return nullMatcher
  }

  for (let i = 0, len = routes.length; i < len; i++) {
    let paramMap
    try {
      paramMap = trie.insert(routes[i][0], i)
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(routes[i][0]) : e
    }

    handlers[i] = [routes[i][1], paramMap.length !== 0 ? paramMap : null]
  }

  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp()
  for (let i = 0, len = handlers.length; i < len; i++) {
    const paramMap = handlers[i][1]
    if (paramMap) {
      for (let j = 0, len = paramMap.length; j < len; j++) {
        paramMap[j][1] = paramReplacementMap[paramMap[j][1]]
      }
    }
  }

  const handlerMap: HandlerData<T>[] = []
  // using `in` because indexReplacementMap is a sparse array
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlers[indexReplacementMap[i]]
  }

  return [regexp, handlerMap] as Matcher<T>
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
  middleware?: Record<string, Record<string, T[]>>
  routes?: Record<string, Record<string, T[]>>

  constructor() {
    this.middleware = { [METHOD_NAME_ALL]: {} }
    this.routes = { [METHOD_NAME_ALL]: {} }
  }

  add(method: string, path: string, handler: T) {
    const { middleware, routes } = this

    if (!middleware || !routes) {
      throw new Error('Can not add a route since the matcher is already built.')
    }

    if (!methodNames.includes(method)) methodNames.push(method)

    if (path === '/*') {
      path = '*'
    }

    if (/\*$/.test(path)) {
      middleware[method] ||= {}
      const re = buildWildcardRegExp(path)
      middleware[method][path] ||= findMiddleware(middleware[METHOD_NAME_ALL], path) || []
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            ;(path === '*' || path === p) && middleware[m][p].push(handler)
          })
        }
      })
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => (path === '*' || re.test(p)) && routes[m][p].push(handler)
          )
        }
      })

      return
    }

    const paths = checkOptionalParameter(path) || [path]
    for (let i = 0, len = paths.length; i < len; i++) {
      const path = paths[i]

      routes[method] ||= {}

      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path] ||= [
            ...(routes[METHOD_NAME_ALL][path] ||
              findMiddleware(middleware[method], path) ||
              findMiddleware(middleware[METHOD_NAME_ALL], path) ||
              []),
          ]
          routes[m][path].push(handler)
        }
      })
    }
  }

  match(method: string, path: string): Result<T> | null {
    const matchers = this.buildAllMatchers()

    this.match = (method, path) => {
      const matcher = matchers[method]
      const match = path.match(matcher[0])
      if (!match) {
        return null
      }

      const index = match.indexOf('', 1)
      const [handlers, paramMap] = matcher[1][index]
      if (!paramMap) {
        return { handlers, params: emptyParam }
      }

      const params: Record<string, string> = {}
      for (let i = 0, len = paramMap.length; i < len; i++) {
        params[paramMap[i][0]] = match[paramMap[i][1]]
      }

      return { handlers, params }
    }

    return this.match(method, path)
  }

  private buildAllMatchers(): Record<string, Matcher<T>> {
    const matchers: Record<string, Matcher<T>> = {}

    methodNames.forEach((method) => {
      matchers[method] = this.buildMatcher(method) || matchers[METHOD_NAME_ALL]
    })

    // Release cache
    this.middleware = this.routes = undefined

    return matchers
  }

  private buildMatcher(method: string): Matcher<T> | null {
    const routes: [string, T[]][] = []

    let hasOwnRoute = method === METHOD_NAME_ALL
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ;[this.middleware!, this.routes!].forEach((r) => {
      const ownRoute = r[method]
        ? Object.keys(r[method]).map((path) => [path, r[method][path]])
        : []
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true
        routes.push(...(ownRoute as [string, T[]][]))
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...(Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]]) as [
            string,
            T[]
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
