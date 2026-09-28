import type { ParamIndexMap, Result, Router } from '../../router'
import { METHOD_NAME_ALL } from '../../router'

export type HandlerData<T> = [T, ParamIndexMap][]
export type StaticMap<T> = Record<string, Result<T>>
export type Matcher<T> = [RegExp, HandlerData<T>[], StaticMap<T>]
export type MatcherMap<T> = Record<string, Matcher<T> | null>

export const emptyParam: string[] = []
export function match<R extends Router<T>, T>(this: R, method: string, path: string): Result<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchers: MatcherMap<T> = (this as any).buildAllMatchers()

  const match = ((method, path) => {
    const matcher = (matchers[method] || matchers[METHOD_NAME_ALL]) as Matcher<T>

    const staticMatch = matcher[2][path]
    if (staticMatch) {
      return staticMatch
    }

    const match = path.match(matcher[0])
    if (!match) {
      return [[], emptyParam]
    }

    // The `$()` end marker always captures '', but an empty-capable param
    // pattern (e.g. `:x{[0-9]*}`) can also capture ''. The marker is the
    // last '' group that maps to a handler-data entry.
    let index = match.lastIndexOf('')
    while (index > 0 && !Array.isArray(matcher[1][index])) {
      index = match.lastIndexOf('', index - 1)
    }
    return [matcher[1][index], match]
  }) as Router<T>['match']

  this.match = match
  return match(method, path)
}
