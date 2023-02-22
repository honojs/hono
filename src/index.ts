// @denoify-ignore

import { Hono } from './hono'
export type {
  Env,
  ErrorHandler,
  Handler,
  MiddlewareHandler,
  Next,
  NotFoundHandler,
  ValidationTargets,
} from './types'
export type { Context, ContextVariableMap } from './context'
export type { HonoRequest } from './request'


declare module './hono' {
  interface Hono {
    fire(): void
  }
}

Hono.prototype.fire = function () {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  addEventListener('fetch', (event: FetchEvent): void => {
    void event.respondWith(this.handleEvent(event))
  })
}

export { Hono }
