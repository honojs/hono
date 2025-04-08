import { METHOD_NAME_ALL } from '../../router'
import type { ParamIndexMap, Params, Result, Router } from '../../router'
import { checkOptionalParameter, getPattern, splitRoutingPath } from '../../utils/url'

const emptyParams = Object.create(null)

const isStaticPath = (path: string) => splitRoutingPath(path).every((p) => getPattern(p) === null)

type InternalHandler<T> = T & {
  order: number
}
type InternalRouter<T> = Router<InternalHandler<T>>

type Route<T> = [InternalHandler<T>, Params] & [InternalHandler<T>, ParamIndexMap]

export class OptimizeRouter<T> implements Router<T> {
  name: string = 'OptimizeRouter'
  #order = 0
  #router: InternalRouter<T>
  #routes: Record<string, Record<string, Route<T>[]>> = Object.create(null)

  constructor(init: { router: InternalRouter<T> }) {
    this.#router = init.router
  }

  add(method: string, path: string, handler: InternalHandler<T>) {
    const results = checkOptionalParameter(path)
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.add(method, results[i], handler)
      }
      return
    }

    if (typeof handler !== 'function' && typeof handler !== 'object') {
      handler = Object(handler)
      this.#transformMatchResult = (matchResult) => {
          for (const i in matchResult[0]) {
            matchResult[0][i][0] = matchResult[0][i][0].valueOf() as InternalHandler<T>
          }
      }
    }

   handler.order = ++this.#order

    if (isStaticPath(path)) {
      this.#routes[path] ||= Object.create(null)
      this.#routes[path][method] ||= []

      this.#routes[path][method].push([handler, emptyParams])
    } else {
      this.#router.add(method, path, handler)
    }
  }

  match(method: string, path: string): Result<T> {
    const matchResult = this.#router.match(method, path)
    const staticResult = this.#routes[path]

    if (staticResult === undefined) {
      return matchResult as Result<T>
    }

    const staticHandlers = staticResult[method] || staticResult[METHOD_NAME_ALL]

    if (staticHandlers) {
      for (const staticHandler of staticHandlers) {
        matchResult[0].push(
          staticHandler
        )
      }
    }

    if (matchResult.length > 1) {
      matchResult[0].sort((a, b) => a[0].order - b[0].order)
    }

    this.#transformMatchResult(matchResult)

    return matchResult as Result<T>
  }

  #transformMatchResult = (() => {}) as (matchResult: Result<InternalHandler<T>>) => void
}
