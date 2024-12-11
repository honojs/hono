import { METHOD_NAME_ALL } from '../../router'
import type { ParamIndexMap, Params, Result, Router } from '../../router'
import { checkOptionalParameter, getPattern, splitRoutingPath } from '../../utils/url'

const emptyParams = Object.create(null)

const isStaticPath = (path: string) => splitRoutingPath(path).every((p) => getPattern(p) === null)

export class OptimizeRouter<T> implements Router<T> {
  name: string = 'OptimizeRouter'
  #router: Router<number>
  #handlers: T[] = []
  #routes: Record<string, Record<string, number[]>> = Object.create(null)

  constructor(init: { router: Router<number> }) {
    this.#router = init.router
  }

  add(method: string, path: string, handler: T) {
    const results = checkOptionalParameter(path)
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.add(method, results[i], handler)
      }
      return
    }

    this.#handlers.push(handler)
    const order = this.#handlers.length - 1

    if (isStaticPath(path)) {
      this.#routes[path] ||= Object.create(null)
      this.#routes[path][method] ||= []

      this.#routes[path][method].push(order)
    } else {
      this.#router.add(method, path, order)
    }
  }

  match(method: string, path: string): Result<T> {
    const dynamicResult = this.#router.match(method, path)
    const matchResult = dynamicResult[0]
    const staticResult = this.#routes[path]

    if (staticResult === undefined) {
      return [
        matchResult.map(([order, params]) => [this.#handlers[order], params]),
        dynamicResult[1],
      ] as Result<T>
    }

    const order = staticResult[method] || staticResult[METHOD_NAME_ALL]

    if (order) {
      matchResult.push(...order.map<[number, Params] & [number, ParamIndexMap]>((o) => [o, emptyParams]))
    }

    if (matchResult.length > 1) {
      matchResult.sort((a, b) => a[0] - b[0])
    }

    return [
      matchResult.map(([order, params]) => [this.#handlers[order], params]),
      dynamicResult[1],
    ] as Result<T>
  }
}
