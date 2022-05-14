import type { Context } from '../../context'
import type { Next } from '../../hono'

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
