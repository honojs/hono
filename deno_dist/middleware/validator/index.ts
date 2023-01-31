import type { Context } from '../../context.ts'
import type { Env, ValidationTypes, MiddlewareHandler } from '../../types.ts'

type ValidationTypeKeysWithBody = 'form' | 'json'
type ValidationTypeByMethod<M> = M extends 'get' | 'head' // GET and HEAD request must not have a body content.
  ? Exclude<keyof ValidationTypes, ValidationTypeKeysWithBody>
  : keyof ValidationTypes

export const validator = <
  T,
  P extends string,
  M extends string,
  U extends ValidationTypeByMethod<M>,
  V extends { [K in U]: T },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Env = any
>(
  type: U,
  validationFunc: (value: ValidationTypes[U], c: Context<E>) => T | Response | Promise<Response>
): MiddlewareHandler<E, P, V> => {
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

    const res = validationFunc(value, c)

    if (res instanceof Response || res instanceof Promise) {
      return res
    }

    c.req.addValidatedData(type, res as {})

    await next()
  }
}
