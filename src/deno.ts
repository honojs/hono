export { Hono } from './hono'
export type { Handler, Next } from './hono'
export { Context } from './context'
export type { Env } from './context'

declare global {
  interface FetchEvent extends Event {
    request: Request
    respondWith(response: Promise<Response> | Response): Promise<Response>
  }
}
