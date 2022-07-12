// @denoify-ignore
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./request.ts" /> Import "declare global" for the Request interface.

import { Hono } from './hono'
export type { Handler, Next } from './hono'
export type { Context } from './context'

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
