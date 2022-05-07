import { Router, Result, METHOD_NAME_ALL } from '@/router'
import type { ParamMap } from '@/router/reg-exp-router/trie'
import { Trie } from '@/router/reg-exp-router/trie'

type Route<T> = [string, T]
type HandlerData<T> = [T[], ParamMap | null]
type Matcher<T> = [RegExp, HandlerData<T>[]]

const regExpMatchAll = new RegExp('')
const emptyParam = {}

function buildRegExp(path: string): RegExp {
  if (path === '*') {
    return regExpMatchAll
  }

  const tmp = `^${path.replace(/\*(?!$)|:[^\/]+/g, '[^/]+')}` // /prefix/*/path/to or /prefix/:label/path/to => /prefix/[^/]+/path/to
  const regExpStr = tmp.endsWith('*')
    ? tmp.replace(/\/\*$/, '(?:$|/)') // /path/to/* => /path/to(?:$|/)
    : `${tmp}$` // /path/to/action => /path/to/action$

  return new RegExp(regExpStr)
}

export class RegExpRouter<T> extends Router<T> {
  routes?: Record<string, Route<T>[]> = {}

  add(method: string, path: string, handler: T) {
    if (!this.routes) {
      throw new Error('Can not add a route since the matcher is already built.')
    }

    this.routes[method] ||= []
    this.routes[method].push([path, handler])
  }

  match(method: string, path: string): Result<T> | null {
    const matchers = this.buildAllMatchers()

    let match: typeof this.match

    // Optimization for middleware
    const methods = Object.keys(matchers)
    if (methods.length === 1 && methods[0] === METHOD_NAME_ALL) {
      const [regexp, handlers] = matchers[METHOD_NAME_ALL]
      if (handlers.length === 1) {
        const result = new Result(handlers[0][0], emptyParam)
        if (regexp === regExpMatchAll) {
          match = () => result
        } else if (handlers.length === 1 && !handlers[0][1]) {
          match = (_, path) => (regexp.test(path) ? result : null)
        }
      }
    }

    match ||= (method, path) => {
      const matcher = matchers[method] || matchers[METHOD_NAME_ALL]
      if (!matcher) {
        return null
      }

      const match = path.match(matcher[0])
      if (!match) {
        return null
      }

      const index = match.indexOf('', 1)
      const [handler, paramMap] = matcher[1][index]
      if (!paramMap) {
        return new Result(handler, emptyParam)
      }

      const params: Record<string, string> = {}
      for (let i = 0; i < paramMap.length; i++) {
        params[paramMap[i][0]] = match[paramMap[i][1]]
      }
      return new Result(handler, params)
    }

    this.match = match
    return this.match(method, path)
  }

  private buildAllMatchers(): Record<string, Matcher<T>> {
    const matchers: Record<string, Matcher<T>> = {}
    Object.keys(this.routes).forEach((method) => {
      matchers[method] = this.buildMatcher(method)
    })

    delete this.routes // to reduce memory usage

    return matchers
  }

  private buildMatcher(method: string): Matcher<T> {
    const trie = new Trie()
    const handlers: HandlerData<T>[] = []

    const targetMethods = [method]
    if (method !== METHOD_NAME_ALL) {
      targetMethods.unshift(METHOD_NAME_ALL)
    }
    const routes = targetMethods.flatMap((method) => this.routes[method] || [])

    if (routes.length === 0) {
      return null
    }

    if (method === METHOD_NAME_ALL) {
      const handlerData: HandlerData<T> = [[routes[0][1]], null]
      if (routes.length === 1 && routes[0][0] === '*') {
        const handlerDataList = [handlerData]
        handlerDataList[-1] = handlerData // XXX: dirty hack. fail-safe for indexOf returns -1.
        return [regExpMatchAll, handlerDataList]
      }

      if (routes.length === 1 && !routes[0][0].match(/:/)) {
        return [buildRegExp(routes[0][0]), [handlerData]]
      }
    }

    const routes2: [RegExp, T][] | undefined = []
    for (let i = 0; i < routes.length; i++) {
      routes2[i] = [buildRegExp(routes[i][0]), routes[i][1]]
    }

    const routes3: [string, T[]][] = []
    for (let i = 0; i < routes.length; i++) {
      const handlers: T[] = []

      for (let j = 0; j <= i; j++) {
        if (i === j) {
          handlers.push(routes[i][1])
        } else if (routes2[j][0].test(routes[i][0])) {
          handlers.push(routes2[j][1])
        }
      }

      routes3[i] = [routes[i][0], handlers]
    }

    for (let i = 0; i < routes3.length; i++) {
      const paramMap = trie.insert(routes3[i][0], i)
      handlers[i] = [routes3[i][1], Object.keys(paramMap).length !== 0 ? paramMap : null]
    }

    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp()
    for (let i = 0; i < handlers.length; i++) {
      const paramMap = handlers[i][1]
      if (paramMap) {
        for (let i = 0; i < paramMap.length; i++) {
          paramMap[i][1] = paramReplacementMap[paramMap[i][1]]
        }
      }
    }

    const handlerMap: HandlerData<T>[] = []
    // using `in` because indexReplacementMap is a sparse array
    for (const i in indexReplacementMap) {
      handlerMap[i] = handlers[indexReplacementMap[i]]
    }

    return [regexp, handlerMap]
  }
}
