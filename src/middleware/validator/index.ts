import type { Context } from '../../context'
import type { Environment, Next, Route, ValidationTypes } from '../../types'
import { mergeObjects } from '../../utils/object'

type ValidatorHandler<E extends Partial<Environment>, R extends Route = Route, I = unknown> = (
  c: Context<E, R, I>,
  next: Next
) => Promise<Response | undefined | void> | Response

export const validator = <
  T,
  U extends ValidationTypes,
  V extends { type: U; data: T },
  // eslint-disable-next-line @typescript-eslint/ban-types
  V2 = {},
  E extends Partial<Environment> = Environment
>(
  type: U,
  validationFunc: (value: unknown, c: Context<E>) => T | Response | Promise<Response>
): ValidatorHandler<E, Route, V | V2> => {
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
