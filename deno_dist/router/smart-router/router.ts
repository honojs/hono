/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { Router, Result } from '../../router.ts'
import { UnsupportedPathError } from '../../router.ts'

export class SmartRouter<T> implements Router<T> {
  routers: Router<T>[] = []
  routes?: [string, string, T][] = []

  constructor(init: Pick<SmartRouter<T>, 'routers'>) {
    Object.assign(this, init)
  }

  add(method: string, path: string, handler: T) {
    if (!this.routes) {
      throw new Error('Can not add a route since the matcher is already built.')
    }

    this.routes.push([method, path, handler])
  }

  match(method: string, path: string): Result<T> | null {
    if (!this.routes) {
      throw new Error('Fatal error')
    }

    const { routers, routes } = this
    const len = routers.length
    let i = 0
    let res
    for (; i < len; i++) {
      const router = routers[i]
      try {
        routes.forEach((args) => {
          router.add(...args)
        })
        res = router.match(method, path)
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue
        }
        throw e
      }

      this.match = router.match.bind(router)
      this.routers = [router]
      this.routes = undefined
      break
    }

    if (i === len) {
      // not found
      throw new Error('Fatal error')
    }

    return res || null
  }

  get activeRouter() {
    if (this.routes || this.routers.length !== 1) {
      throw new Error('No active router has been determined yet.')
    }

    return this.routers[0]
  }
}
