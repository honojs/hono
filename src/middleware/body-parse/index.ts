import type { Context } from '@/context'
import { parseBody } from '@/utils/body'

export const bodyParse = () => {
  return async (ctx: Context, next: Function) => {
    ctx.req.parsedBody = await parseBody(ctx.req)
    await next()
  }
}
