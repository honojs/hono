/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Hono } from '../../hono'

/**
 * Route handler type compatible with Next.js 15 App Router.
 * Next.js 15 expects the return type to include `void` and
 * the parameter to accept `NextRequest | Request`.
 */
export type NextRouteHandler = (
  req: Request,
  context?: unknown
) => Response | void | Promise<Response | void>

export const handle =
  (app: Hono<any, any, any>): NextRouteHandler =>
  (req: Request): Response | Promise<Response> => {
    return app.fetch(req)
  }
