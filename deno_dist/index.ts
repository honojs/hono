// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./request.ts" /> Import "declare global" for the Request interface.

import { Hono } from './hono.ts'
export type { Handler, Next } from './hono.ts'
export { Context } from './context.ts'

declare module './hono.ts' {
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
