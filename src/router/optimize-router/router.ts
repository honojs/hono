import { METHOD_NAME_ALL, type Params, type Result, type Router } from '../../router'
import { getPattern, splitRoutingPath } from '../../utils/url'

const isStaticPath = (path: string) => {
  const parts = splitRoutingPath(path)

  for (const part of parts) {
    if (getPattern(part)) {
      return false
    }
  }

  return true
}

export class OptimizeRouter<T> implements Router<T> {
  name: string = 'OptimizeRouter'
  #router: Router<number>
  #handlers: T[] = []
  #routes: Record<string, Record<string, number[]>> = Object.create(null)

  constructor(init: { router: Router<number> }) {
    this.#router = init.router
  }

  add(method: string, path: string, handler: T) {
    this.#handlers.push(handler)
    const order = this.#handlers.length - 1

    if (isStaticPath(path)) {
      if (!this.#routes[path]) {
        this.#routes[path] = Object.create(null)
      }
      if (!this.#routes[path][method]) {
        this.#routes[path][method] = []
      }
      this.#routes[path][method].push(order)
    } else {
      this.#router.add(method, path, order)
    }
  }

  match(method: string, path: string): Result<T> {
    const matchResult = this.#router.match(method, path)[0]
    const staticOrder = this.#routes[path]

    if (staticOrder === undefined) {
      return [
        matchResult.map(([order, params]) => [this.#handlers[order], params]) as [T, Params][],
      ]
    }

    const order = staticOrder[method] || staticOrder[METHOD_NAME_ALL]

    if (order) {
      for (const o of order) {
        matchResult.push([o, Object.create(null)])
      }
    }

    if (matchResult.length > 1) {
      matchResult.sort((a, b) => a[0] - b[0])
    }

    return [matchResult.map(([order, params]) => [this.#handlers[order], params]) as [T, Params][]]
  }
}
