import type { Context } from '../../context'
import type { Env, ValidationTypes, MiddlewareHandler } from '../../types'
import { mergeObjects } from '../../utils/object'

type ValidationTypeKeysWithBody = 'form' | 'json'
type ValidationTypeByMethod<M> = M extends 'get' | 'head' // GET and HEAD request must not have a body content.
  ? Exclude<keyof ValidationTypes, ValidationTypeKeysWithBody>
  : keyof ValidationTypes

export const validator = <
  T,
  Path extends string,
  Method extends string,
  U extends ValidationTypeByMethod<Method>,
  V extends { type: U; data: T },
  V2 = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Env = any
>(
  type: U,
  validationFunc: (value: ValidationTypes[U], c: Context<E>) => T | Response | Promise<Response>
): MiddlewareHandler<E, Path, V | V2> => {
  return async (c, next) => {
    let value = {}

    switch (type) {
      case 'json':
        try {
          value = await c.req.json()
        } catch {
          console.error('Error: Malformed JSON in request body')
          return c.json(
            {
              success: false,
              message: 'Malformed JSON in request body',
            },
            400
          )
        }
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = validationFunc(value, c as any)

    if (res instanceof Response || res instanceof Promise) {
      return res
    }

    const target = c.req.valid()
    const newObject = mergeObjects(target, res)

    c.req.valid(newObject)
    await next()
  }
}
