import type { MiddlewareHandler } from '../../types.ts'

type prettyOptions = {
  space: number
}

export const prettyJSON = (options: prettyOptions = { space: 2 }): MiddlewareHandler => {
  return async function prettyJSON(c, next) {
    const pretty = c.req.query('pretty') || c.req.query('pretty') === '' ? true : false
    await next()
    if (pretty && c.res.headers.get('Content-Type')?.startsWith('application/json')) {
      const obj = await c.res.json()
      c.res = new Response(JSON.stringify(obj, null, options.space), c.res)
    }
  }
}
