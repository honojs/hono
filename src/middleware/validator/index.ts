import type { Context } from '../../context'
import type { Environment, Handler, ValidationTypes } from '../../types'

export const validator = <T, U extends ValidationTypes = ValidationTypes, E extends Partial<Environment>= Partial<Environment>, M extends string = string, S = unknown>(
  type: U,
  validationFunc: (value: unknown, c: Context<string, E>) => Promise<Response> | Response | T
): Handler<string, M, E, { [K in M]: { type: U; data: T } } & S> => {
  return async (c, next)=> {
    let value = {}

    switch(type) {
      case 'json':
        value = await c.req.json()
        break
        case 'form':
          value = await c.req.parseBody()
          break
        case 'query':
          value = c.req.query()
          break
        case 'queries':
          value = c.req.queries()
          break
      }

    const res = validationFunc(value, c)

    if (res instanceof Response || res instanceof Promise<Response>) {
      return res
    }

    c.req.valid(res)
    await next()
  }
}
