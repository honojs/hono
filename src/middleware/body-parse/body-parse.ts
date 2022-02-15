import type { Context } from '../../context'

export const bodyParse = () => {
  return async (ctx: Context, next: Function) => {
    const contentType = ctx.req.headers.get('Content-Type') || ''

    if (contentType.includes('application/json')) {
      ctx.req.parsedBody = await ctx.req.json()
    } else if (contentType.includes('application/text')) {
      ctx.req.parsedBody = await ctx.req.text()
    } else if (contentType.includes('text/html')) {
      ctx.req.parsedBody = await ctx.req.text()
    } else if (contentType.includes('form')) {
      const form: Record<string, string | File> = {}
      const data = [...(await ctx.req.formData())].reduce((acc, cur) => {
        acc[cur[0]] = cur[1]
        return acc
      }, form)
      ctx.req.parsedBody = data
    }

    await next()
  }
}
