/* eslint-disable @typescript-eslint/no-explicit-any */
// @denoify-ignore
import type { Hono } from '../../hono'

export const handle =
  (app: Hono<any, any, any>) =>
  (req: Request, requestContext: Omit<ExecutionContext, 'passThroughOnException'>) => {
    return app.fetch(
      req,
      {},
      {
        waitUntil: requestContext?.waitUntil,
        passThroughOnException: () => {
          throw new Error('`passThroughOnException` is not implemented in the Vercel')
        },
      }
    )
  }
