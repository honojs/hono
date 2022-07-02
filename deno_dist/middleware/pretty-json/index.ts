import type { Context } from '../../context.ts'
import type { Next } from '../../hono.ts'

type prettyOptions = {
  space: number
}

export const prettyJSON = (options: prettyOptions = { space: 2 }) => {
  return async (c: Context, next: Next) => {
    const pretty = c.req.query('pretty') || c.req.query('pretty') === '' ? true : false
    c.pretty(pretty, options.space)
    await next()
  }
}
