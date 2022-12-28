import type { Context } from '../../context.ts'
import type { Environment, Handler, ValidationTypes } from '../../types.ts'
import { mergeObjects } from '../../utils/object.ts'

type HandlerFunc<T, E extends Environment> = (
  value: unknown,
  c: Context<E>
) => Promise<Response> | Response | T

// eslint-disable-next-line @typescript-eslint/ban-types
export const validator = <T, U extends ValidationTypes, V extends { type: U; data: T }, V2 = {}, E extends Environment = Environment, M extends string = string, P extends string = string>(
  type: U,
  validationFunc: HandlerFunc<T, E>
): Handler<E, M, P, { [K in M]: V | V2 } > => {
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

    const target = c.req.valid()
    const newObject = mergeObjects(target, res)

    c.req.valid(newObject)
    await next()
  }
}
