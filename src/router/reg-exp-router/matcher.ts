import type { Router, Result, ParamIndexMap } from '../../router'

export type HandlerData<T> = [T, ParamIndexMap][]
export type StaticMap<T> = Record<string, Result<T>>
export type Matcher<T> = [RegExp, HandlerData<T>[], StaticMap<T>]
export type MatcherMap<T> = Record<string, Matcher<T>>

export const emptyParam: string[] = []
export const buildAllMatchersKey = Symbol('buildAllMatchers')
export function match<R extends Router<T>, T>(this: R, method: string, path: string): Result<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchers: MatcherMap<T> = (this as any)[buildAllMatchersKey]()

  this.match = (method, path) => {
    const matcher = matchers[method]

    const staticMatch = matcher[2][path]
    if (staticMatch) {
      return staticMatch
    }

    const match = path.match(matcher[0])
    if (!match) {
      return [[], emptyParam]
    }

    const index = match.indexOf('', 1)
    return [matcher[1][index], match]
  }

  return this.match(method, path)
}
