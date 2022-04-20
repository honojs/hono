import type { Context } from '@/context'

type prettyOptions = {
  space: number
}

export const prettyJSON = (options: prettyOptions = { space: 2 }) => {
  return async (c: Context, next: Function) => {
    const pretty = c.req.query('pretty') || c.req.query('pretty') === '' ? true : false
    c.pretty(pretty, options.space)
    await next()
  }
}
