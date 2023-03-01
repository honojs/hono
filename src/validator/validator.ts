import type { Context } from '../context'
import type { Env, ValidationTargets, MiddlewareHandler } from '../types'
import { parseBody } from '../utils/body'

type ValidationTargetKeysWithBody = 'form' | 'json'
type ValidationTargetByMethod<M> = M extends 'get' | 'head' // GET and HEAD request must not have a body content.
  ? Exclude<keyof ValidationTargets, ValidationTargetKeysWithBody>
  : keyof ValidationTargets

export const validator = <
  T,
  P extends string,
  M extends string,
  U extends ValidationTargetByMethod<M>,
  V extends { [K in U]: T },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Env = any
>(
  target: U,
  validationFunc: (value: ValidationTargets[U], c: Context<E>) => T | Response | Promise<Response>
): MiddlewareHandler<E, P, V> => {
  return async (c, next) => {
    let value = {}

    switch (target) {
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
        value = await parseBody(c.req.raw.clone())
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

    c.req.addValidatedData(target, res as never)

    await next()
  }
}
