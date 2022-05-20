import { Hono } from './hono'
export type { Handler, Next } from './hono'
export { Context } from './context'
export type { Env } from './context'

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
