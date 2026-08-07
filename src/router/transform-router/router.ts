import type { Result, Router } from '../../router'
import { RegExpRouter } from '../reg-exp-router'
import { SmartRouter } from '../smart-router'
import { TrieRouter } from '../trie-router'

export type RouterTransform<T> = (handler: T, method: string, path: string) => T

export type TransformRouterOptions<T> = {
  /**
   * The router to which transformed registrations and matching are delegated.
   */
  delegateRouter?: Router<T>
  transform: RouterTransform<T>
}

/**
 * A router decorator that transforms handlers when they are registered and delegates matching to
 * another router.
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { TransformRouter } from 'hono/router/transform-router'
 *
 * const app = new Hono({
 *   router: new TransformRouter({
 *     transform: ([handler, route]) => [
 *       async (c, next) => {
 *         console.time(route.path)
 *         try {
 *           return await handler(c, next)
 *         } finally {
 *           console.timeEnd(route.path)
 *         }
 *       },
 *       route,
 *     ],
 *   }),
 * })
 * ```
 */
export class TransformRouter<T> implements Router<T> {
  #delegateRouter: Router<T>
  #transform: RouterTransform<T>

  constructor(init: TransformRouterOptions<T>) {
    this.#delegateRouter =
      init.delegateRouter ??
      new SmartRouter({
        routers: [new RegExpRouter(), new TrieRouter()],
      })
    this.#transform = init.transform
  }

  get name(): string {
    return `TransformRouter + ${this.#delegateRouter.name}`
  }

  add(method: string, path: string, handler: T): void {
    this.#delegateRouter.add(method, path, this.#transform(handler, method, path))
  }

  match(method: string, path: string): Result<T> {
    return this.#delegateRouter.match(method, path)
  }
}
