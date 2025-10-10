import type { Context } from '../context'
import { getCookie } from '../helper/cookie'
import { HTTPException } from '../http-exception'
import type { Env, MiddlewareHandler, TypedResponse, ValidationTargets } from '../types'
import type { BodyData } from '../utils/body'
import { bufferToFormData } from '../utils/buffer'

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

const jsonRegex = /^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/
const multipartRegex = /^multipart\/form-data(;\s?boundary=[a-zA-Z0-9'"()+_,\-./:=?]+)?$/
const urlencodedRegex = /^application\/x-www-form-urlencoded(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/

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
        ? unknown extends InputType
          ? OutputTypeExcludeResponseType
          : InputType
        : { [K2 in keyof OutputTypeExcludeResponseType]: ValidationTargets[K][K2] }
    }
    out: { [K in U]: OutputTypeExcludeResponseType }
  } = {
    in: {
      [K in U]: K extends 'json'
        ? unknown extends InputType
          ? OutputTypeExcludeResponseType
          : InputType
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
        if (!contentType || !jsonRegex.test(contentType)) {
          break
        }
        try {
          value = await c.req.json()
        } catch {
          const message = 'Malformed JSON in request body'
          throw new HTTPException(400, { message })
        }
        break
      case 'form': {
        if (
          !contentType ||
          !(multipartRegex.test(contentType) || urlencodedRegex.test(contentType))
        ) {
          break
        }

        let formData: FormData

        if (c.req.bodyCache.formData) {
          formData = await c.req.bodyCache.formData
        } else {
          try {
            const arrayBuffer = await c.req.arrayBuffer()
            formData = await bufferToFormData(arrayBuffer, contentType)
            c.req.bodyCache.formData = formData
          } catch (e) {
            let message = 'Malformed FormData request.'
            message += e instanceof Error ? ` ${e.message}` : ` ${String(e)}`
            throw new HTTPException(400, { message })
          }
        }

        const form: BodyData<{ all: true }> = {}
        formData.forEach((value, key) => {
          if (key.endsWith('[]')) {
            ;((form[key] ??= []) as unknown[]).push(value)
          } else if (Array.isArray(form[key])) {
            ;(form[key] as unknown[]).push(value)
          } else if (key in form) {
            form[key] = [form[key] as string | File, value]
          } else {
            form[key] = value
          }
        })
        value = form
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
