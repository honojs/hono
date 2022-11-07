// @denoify-ignore
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./request.ts" /> Import "declare global" for the Request interface.

import { Hono } from './hono'
export type {
  Next,
  ContextVariableMap,
  MiddlewareHandler,
  ErrorHandler,
  NotFoundHandler,
} from './types'
export type { Context } from './context'
export type { Validator } from './validator/validator'
import type { CustomHandler } from './types'
export type { CustomHandler as Handler }

declare module './hono' {
  interface Hono {
    fire(): void
  }
}

Hono.prototype.fire = function () {
  addEventListener('fetch', (event: FetchEvent): void => {
    void event.respondWith(this.handleEvent(event))
  })
}

export { Hono }
