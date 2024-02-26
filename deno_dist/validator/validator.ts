import type { Context } from '../context.ts'
import { getCookie } from '../helper/cookie/index.ts'
import { HTTPException } from '../http-exception.ts'
import type { Env, ValidationTargets, MiddlewareHandler, TypedResponse } from '../types.ts'
import type { BodyData } from '../utils/body.ts'
import { bufferToFormData } from '../utils/buffer.ts'

type ValidationTargetKeysWithBody = 'form' | 'json'
type ValidationTargetByMethod<M> = M extends 'get' | 'head' // GET and HEAD request must not have a body content.
  ? Exclude<keyof ValidationTargets, ValidationTargetKeysWithBody>
  : keyof ValidationTargets

export type ValidationFunction<
  InputType,
  OutputType,
  E extends Env = {},
  P extends string = string
> = (
  value: InputType,
  c: Context<E, P>
) => OutputType | Response | Promise<OutputType> | Promise<Response>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcludeResponseType<T> = T extends Response & TypedResponse<any> ? never : T

export const validator = <
  InputType,
  P extends string,
  M extends string,
  U extends ValidationTargetByMethod<M>,
  OutputType = ValidationTargets[U],
  OutputTypeExcludeResponseType = ExcludeResponseType<OutputType>,
  P2 extends string = P,
  V extends {
    in: {
      [K in U]: K extends 'json'
        ? InputType
        : { [K2 in keyof OutputTypeExcludeResponseType]: ValidationTargets[K][K2] }
    }
    out: { [K in U]: OutputTypeExcludeResponseType }
  } = {
    in: {
      [K in U]: K extends 'json'
        ? InputType
        : { [K2 in keyof OutputTypeExcludeResponseType]: ValidationTargets[K][K2] }
    }
    out: { [K in U]: OutputTypeExcludeResponseType }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Env = any
>(
  target: U,
  validationFunc: ValidationFunction<
    unknown extends InputType ? ValidationTargets[U] : InputType,
    OutputType,
    E,
    P2
  >
): MiddlewareHandler<E, P, V> => {
  return async (c, next) => {
    let value = {}
    const contentType = c.req.header('Content-Type')

    switch (target) {
      case 'json':
        if (!contentType || !contentType.startsWith('application/json')) {
          const message = `Invalid HTTP header: Content-Type=${contentType}`
          throw new HTTPException(400, { message })
        }
        if (c.req.bodyCache.json) {
          value = await c.req.bodyCache.json
          break
        }
        /**
         * Get the arrayBuffer, create JSON object via Response, and cache the arrayBuffer in the c.req.bodyCache if there is no cached content in c.req.bodyCache.json.
         */
        try {
          const arrayBuffer = c.req.bodyCache.arrayBuffer ?? (await c.req.raw.arrayBuffer())
          value = await new Response(arrayBuffer).json()
          c.req.bodyCache.json = value
          c.req.bodyCache.arrayBuffer = arrayBuffer
        } catch {
          const message = 'Malformed JSON in request body'
          throw new HTTPException(400, { message })
        }
        break
      case 'form': {
        if (c.req.bodyCache.formData) {
          value = c.req.bodyCache.formData
          break
        }
        try {
          const contentType = c.req.header('Content-Type')
          if (contentType) {
            const arrayBuffer = c.req.bodyCache.arrayBuffer ?? (await c.req.raw.arrayBuffer())
            const formData = await bufferToFormData(arrayBuffer, contentType)
            const form: BodyData = {}
            formData.forEach((value, key) => {
              form[key] = value
            })
            value = form
            c.req.bodyCache.formData = formData
            c.req.bodyCache.arrayBuffer = arrayBuffer
          }
        } catch (e) {
          let message = 'Malformed FormData request.'
          message += e instanceof Error ? ` ${e.message}` : ` ${String(e)}`
          throw new HTTPException(400, { message })
        }
        break
      }
      case 'query':
        value = Object.fromEntries(
          Object.entries(c.req.queries()).map(([k, v]) => {
            return v.length === 1 ? [k, v[0]] : [k, v]
          })
        )
        break
      case 'param':
        value = c.req.param() as Record<string, string>
        break
      case 'header':
        value = c.req.header()
        break
      case 'cookie':
        value = getCookie(c)
        break
    }

    const res = await validationFunc(value as never, c as never)

    if (res instanceof Response) {
      return res
    }

    c.req.addValidatedData(target, res as never)

    await next()
  }
}
