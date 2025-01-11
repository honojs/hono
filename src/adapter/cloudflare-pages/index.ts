/**
 * @module
 * Cloudflare Pages Adapter for Hono.
 */

export { handle, handleMiddleware, serveStatic } from './handler'
export type { EventContext } from './handler'
import type { EventContext } from './handler'

declare module '../../types' {
  interface DefaultEnv {
    Bindings: DefaultBindings
  }

  interface DefaultBindings {
    eventContext: EventContext<DefaultEnv>
    ASSETS: { fetch: typeof fetch }
  }
}
