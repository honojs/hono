import type { Context } from '../context'
import { getCookie } from '../helper/cookie'
import { HTTPException } from '../http-exception'
import type { Env, MiddlewareHandler, TypedResponse, ValidationTargets, FormValue } from '../types'
import type { BodyData } from '../utils/body'
import { bufferToFormData } from '../utils/buffer'
import type { InferInput } from './utils'

type ValidationTargetKeysWithBody = 'form' | 'json'
type ValidationTargetByMethod<M> = M extends 'get' | 'head' // GET and HEAD request must not have a body content.
  ? Exclude<keyof ValidationTargets, ValidationTargetKeysWithBody>
  : keyof ValidationTargets

export type ValidationFunction<
  InputType,
  OutputType,
  E extends Env = {},
  P extends string = string,
> = (
  value: InputType,
  c: Context<E, P>
) => OutputType | TypedResponse | Promise<OutputType> | Promise<TypedResponse>

const jsonRegex = /^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/
const multipartRegex = /^multipart\/form-data(;\s?boundary=[a-zA-Z0-9'"()+_,\-./:=?]+)?$/
const urlencodedRegex = /^application\/x-www-form-urlencoded(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/

export type ExtractValidationResponse<VF> = VF extends (value: any, c: any) => infer R
  ? R extends Promise<infer PR>
    ? PR extends TypedResponse<infer T, infer S, infer F>
      ? TypedResponse<T, S, F>
      : PR extends Response
        ? PR
        : PR extends undefined
          ? never // undefined → never
          : never // anything else → never
    : R extends TypedResponse<infer T, infer S, infer F>
      ? TypedResponse<T, S, F>
      : R extends Response
        ? R
        : R extends undefined
          ? never // undefined → never
          : never // anything else → never
  : never // Can't extract → never

export const validator = <
  InputType,
  P extends string,
  M extends string,
  U extends ValidationTargetByMethod<M>,
  P2 extends string = P,
  // Capture the actual validation function as a type
  VF extends (
    value: unknown extends InputType ? ValidationTargets[U] : InputType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c: Context<any, P2>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => any = (
    value: unknown extends InputType ? ValidationTargets[U] : InputType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c: Context<any, P2>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => any,
  V extends {
    in: {
      [K in U]: K extends 'json'
        ? unknown extends InputType
          ? ExtractValidatorOutput<VF>
          : InputType
        : InferInput<ExtractValidatorOutput<VF>, K, FormValue>
    }
    out: { [K in U]: ExtractValidatorOutput<VF> }
  } = {
    in: {
      [K in U]: K extends 'json'
        ? unknown extends InputType
          ? ExtractValidatorOutput<VF>
          : InputType
        : InferInput<ExtractValidatorOutput<VF>, K, FormValue>
    }
    out: { [K in U]: ExtractValidatorOutput<VF> }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Env = any,
>(
  target: U,
  validationFunc: VF
): MiddlewareHandler<E, P, V, ExtractValidationResponse<VF>> => {
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
      case 'query': {
        const queries = c.req.queries() || {}
        value = Object.fromEntries(
          Object.entries(queries).map(([k, v]) => {
            return v.length === 1 ? [k, v[0]] : [k, v]
          })
        )
        break
      }
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
      return res as ExtractValidationResponse<VF>
    }

    c.req.addValidatedData(target, res as never)

    return (await next()) as ExtractValidationResponse<VF>
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExtractValidatorOutput<VF> = VF extends (value: any, c: any) => infer R
  ? R extends Promise<infer PR>
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      PR extends Response | TypedResponse<any, any, any>
      ? never
      : PR
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      R extends Response | TypedResponse<any, any, any>
      ? never
      : R
  : never
