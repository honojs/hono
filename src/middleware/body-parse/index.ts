import type { Context } from '../../context'
import type { Next } from '../../hono'
import { parseBody } from '../../utils/body'

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
