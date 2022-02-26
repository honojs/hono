import { parseBody } from '../../utils/body'
import type { Context } from '../../context'

export const bodyParse = () => {
  return async (ctx: Context, next: Function) => {
    ctx.req.parsedBody = await parseBody(ctx.req)
    await next()
  }
}
