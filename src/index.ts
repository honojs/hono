// @denoify-ignore

import { Hono } from './hono'
export type {
  Next,
  MiddlewareHandler,
  ErrorHandler,
  NotFoundHandler,
  ValidationTypes,
} from './types'
export type { Context, ContextVariableMap } from './context'
import type { CustomHandler } from './types'
export type { CustomHandler as Handler }

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
