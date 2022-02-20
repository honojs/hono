import { Router, Result, METHOD_NAME_OF_ALL } from '../../router'
import type { ParamMap, ReplacementMap } from './trie'
import { Trie } from './trie'

type Route<T> = [string, T]
type HandlerData<T> = [T, ParamMap]
type Matcher<T> = [RegExp | true, ReplacementMap, HandlerData<T>[]]

export class RegExpRouter<T> extends Router<T> {
  routes?: {
    [method: string]: Route<T>[]
  } = {}

  matchers?: {
    [method: string]: Matcher<T> | null
  } = null

  add(method: string, path: string, handler: T) {
    if (!this.routes) {
      throw new Error('Can not add a route since the matcher is already built.')
    }

    this.routes[method] ||= []
    this.routes[method].push([path, handler])
  }

  match(method: string, path: string): Result<T> | null {
    if (!this.matchers) {
      this.buildAllMatchers()
    }

    const matcher = this.matchers[method] || this.matchers[METHOD_NAME_OF_ALL]
    if (!matcher) {
      return null
    }

    const [regexp, replacementMap, handlers] = matcher
    if (regexp === true) {
      // '*'
      return new Result(handlers[0][0], {})
    }

    const match = path.match(regexp)
    if (!match) {
      return null
    }
    if (!replacementMap) {
      // there is only one route and no capture
      return new Result(handlers[0][0], {})
    }

    const index = match.indexOf('', 1)
    const [handler, paramMap] = handlers[replacementMap[index]]
    const params: { [key: string]: string } = {}
    const keys = Object.keys(paramMap)
    for (let i = 0; i < keys.length; i++) {
      params[keys[i]] = match[paramMap[keys[i]]]
    }
    return new Result(handler, params)
  }

  private buildAllMatchers() {
    this.matchers ||= {}

    Object.keys(this.routes).forEach((method) => {
      this.buildMatcher(method)
    })

    delete this.routes // to reduce memory usage
  }

  private buildMatcher(method: string) {
    this.matchers ||= {}

    const trie = new Trie()
    const handlers: HandlerData<T>[] = []

    const targetMethods = [method]
    if (method !== METHOD_NAME_OF_ALL) {
      targetMethods.unshift(METHOD_NAME_OF_ALL)
    }
    const routes = targetMethods.flatMap((method) => this.routes[method] || [])

    if (routes.length === 0) {
      this.matchers[method] = null
      return
    }

    if (routes.length === 1 && routes[0][0] === '*') {
      this.matchers[method] = [true, null, [[routes[0][1], {}]]]
      return
    }

    if (routes.length === 1 && !routes[0][0].match(/:/)) {
      // there is only one route and no capture
      const tmp = routes[0][0].endsWith('*')
        ? routes[0][0].replace(/\/\*$/, '(?:$|/)') // /path/to/* => /path/to(?:$|/)
        : `${routes[0][0]}$` // /path/to/action => /path/to/action$
      const regExpStr = `^${tmp.replace(/\*/g, '[^/]+')}` // /prefix/*/path/to => /prefix/[^/]+/path/to
      this.matchers[method] = [new RegExp(regExpStr), null, [[routes[0][1], {}]]]
      return
    }

    for (let i = 0; i < routes.length; i++) {
      const paramMap = trie.insert(routes[i][0], i)
      handlers[i] = [routes[i][1], paramMap]
    }

    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp()
    for (let i = 0; i < handlers.length; i++) {
      const paramMap = handlers[i][1]
      Object.keys(paramMap).forEach((k) => {
        paramMap[k] = paramReplacementMap[paramMap[k]]
      })
    }

    this.matchers[method] = [new RegExp(regexp), indexReplacementMap, handlers]
  }
}
