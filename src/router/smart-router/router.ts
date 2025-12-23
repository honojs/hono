import type { Result, Router } from '../../router'
import { MESSAGE_MATCHER_IS_ALREADY_BUILT, UnsupportedPathError } from '../../router'

export class SmartRouter<T> implements Router<T> {
  name: string = 'SmartRouter'
  #routers: Router<T>[] = []
  #routerConstructors: (new () => Router<T>)[] = []
  #routes?: [string, string, T][] = []

  constructor(init: { routers: Router<T>[] }) {
    this.#routers = [...init.routers]
    this.#routerConstructors = init.routers.map(
      (router) => router.constructor as new () => Router<T>
    )
  }

  add(method: string, path: string, handler: T) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT)
    }

    this.#routes.push([method, path, handler])
  }

  match(method: string, path: string): Result<T> {
    if (!this.#routes) {
      throw new Error('Fatal error')
    }

    const routers = this.#routers
    const routes = this.#routes

    if (routes.length === 0) {
      return [[]]
    }

    const len = routers.length
    let i = 0
    let res
    for (; i < len; i++) {
      const router = routers[i]
      try {
        for (let i = 0, len = routes.length; i < len; i++) {
          router.add(...routes[i])
        }
        res = router.match(method, path)
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue
        }
        throw e
      }

      this.match = router.match.bind(router)
      this.#routers = [router]
      this.#routes = undefined
      break
    }

    if (i === len) {
      // not found
      throw new Error('Fatal error')
    }

    // e.g. "SmartRouter + RegExpRouter"
    this.name = `SmartRouter + ${this.activeRouter.name}`

    return res as Result<T>
  }

  clear(): void {
    this.#routers = this.#routerConstructors.map((RouterClass) => new RouterClass())

    this.match = SmartRouter.prototype.match.bind(this)

    this.name = 'SmartRouter'

    this.#routes = []
  }

  get activeRouter(): Router<T> {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error('No active router has been determined yet.')
    }

    return this.#routers[0]
  }
}
