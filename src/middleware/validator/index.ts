import type { Context } from '../../context'
import type { Environment, Handler, Route, ValidationTypes } from '../../types'
import { mergeObjects } from '../../utils/object'

type HandlerFunc<T, E extends Environment> = (
  value: unknown,
  c: Context<E>
) => Promise<Response> | Response | T

export const validator = <
  T,
  U extends ValidationTypes,
  V extends { type: U; data: T },
  // eslint-disable-next-line @typescript-eslint/ban-types
  V2 = {},
  E extends Environment = Environment
>(
  type: U,
  validationFunc: HandlerFunc<T, E>
): Handler<E, Route, V | V2> => {
  return async (c, next) => {
    let value = {}

    switch (type) {
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

    if (res instanceof Response || res instanceof Promise) {
      return res
    }

    const target = c.req.valid()
    const newObject = mergeObjects(target, res)

    c.req.valid(newObject)
    await next()
  }
}
