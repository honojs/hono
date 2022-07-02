import type { Context } from '../../context.ts'
import type { Next } from '../../hono.ts'
import { parseBody } from '../../utils/body.ts'

declare global {
  interface Request {
    parsedBody: any
  }
}

export const bodyParse = () => {
  return async (ctx: Context, next: Next) => {
    ctx.req.parsedBody = await parseBody(ctx.req)
    await next()
  }
}
