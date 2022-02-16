import { Router, Result, METHOD_NAME_OF_ALL } from '../../router'
import type { ParamMap, ReplacementMap } from './trie'
import { Trie } from './trie'

type Route<T> = [string, T]
type HandlerData<T> = [T, ParamMap]
type Matcher<T> = [RegExp, ReplacementMap, HandlerData<T>[]]

export class RegExpRouter<T> extends Router<T> {
  routes?: {
    [method: string]: Route<T>[]
  } = {}

  matchers?: {
    [method: string]: Matcher<T>
  } = null

  add(method: string, path: string, handler: T) {
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
    const match = path.match(regexp)
    if (!match) {
      return null
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
