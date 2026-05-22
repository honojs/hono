/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Hono } from '../../hono'

/**
 * Next.js 15 App Router introduced two stricter constraints on route handler exports:
 *
 * 1. **Return type**: Next.js 15 expects
 *    `Response | void | Promise<Response | void>`.
 *    The previous `Response | Promise<Response>` lacks the `void` member, which
 *    TypeScript requires to be present for the assignment to type-check — even
 *    though `void` is never returned at runtime.
 *
 * 2. **Second parameter**: Next.js 15 passes a route `context` object as the
 *    second argument.  The handler must declare an optional second parameter so
 *    TypeScript does not widen the inferred signature and produce a type error.
 *
 * Neither change affects runtime behaviour: `app.fetch(req)` always returns a
 * `Response` and the `ctx` argument is intentionally unused.
 */
export const handle =
  (app: Hono<any, any, any>) =>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (req: Request, _ctx?: unknown): Response | void | Promise<Response | void> => {
    return app.fetch(req)
  }
