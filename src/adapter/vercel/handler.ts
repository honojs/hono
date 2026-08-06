/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Hono } from '../../hono'

export function handle(
  app: Hono<any, any, any>
): (req: Request, ctx?: unknown) => Response | Promise<Response> | void {
  return (req: Request, ctx?: unknown): Response | Promise<Response> | void => {
    return app.fetch(req)
  }
}
