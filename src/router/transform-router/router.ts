import type { Result, Router } from '../../router'
import type { H, RouterRoute } from '../../types'

export type HandlerTransform = (route: Readonly<RouterRoute>) => H

export type TransformRouterOptions = {
  /**
   * The router to which transformed registrations and matching are delegated.
   */
  delegateRouter: Router<[H, RouterRoute]>
  transform: HandlerTransform
}

/**
 * A router decorator that transforms Hono handlers when they are registered and delegates matching
 * to another router.
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { RegExpRouter } from 'hono/router/reg-exp-router'
 * import { TransformRouter } from 'hono/router/transform-router'
 *
 * const app = new Hono({
 *   router: new TransformRouter({
 *     delegateRouter: new RegExpRouter(),
 *     transform: ({ handler, method, path }) => async (c, next) => {
 *       const label = `${method} ${path}`
 *       console.time(label)
 *       try {
 *         return await handler(c, next)
 *       } finally {
 *         console.timeEnd(label)
 *       }
 *     },
 *   }),
 * })
 * ```
 */
export class TransformRouter implements Router<[H, RouterRoute]> {
  #delegateRouter: Router<[H, RouterRoute]>
  #transform: HandlerTransform

  constructor(init: TransformRouterOptions) {
    this.#delegateRouter = init.delegateRouter
    this.#transform = init.transform
  }

  get name(): string {
    return `TransformRouter + ${this.#delegateRouter.name}`
  }

  add(method: string, path: string, [handler, route]: [H, RouterRoute]): void {
    this.#delegateRouter.add(method, path, [this.#transform({ ...route, handler }), route])
  }

  match(method: string, path: string): Result<[H, RouterRoute]> {
    return this.#delegateRouter.match(method, path)
  }
}
