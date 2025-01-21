import type { Context } from '../context'
import type { Env, MiddlewareHandler, TypedResponse, ResponseValidationTargets } from '../types'

type ResponseValidationTargetKeys = keyof ResponseValidationTargets

export type ResponseValidationFunction<
  U extends ResponseValidationTargetKeys,
  P extends string,
  E extends Env = {}
> = (
  value: ResponseValidationTargets[U],
  c: Context<E, P>
) => undefined | Response | Promise<Response>

const textRegex = /^text\/([a-z-\.]+\+)?(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/
const jsonRegex = /^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/
const htmlRegex = /^text\/html(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/

export const responseValidator = <
  U extends ResponseValidationTargetKeys,
  P extends string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Env = any
>(
  target: U,
  validationFunc: ResponseValidationFunction<U, P, E>
): MiddlewareHandler<E, P> => {
  return async (c, next) => {
    await next()

    if (!c.finalized) {
      return
    }

    let value: unknown

    const contentType = c.res.headers.get('Content-Type')

    switch (target) {
      case 'body':
        value = c.res.body
        break
      case 'text':
        if (!contentType || !textRegex.test(contentType)) {
          break
        }

        value = c.validateData
        break
      case 'json':
        if (!contentType || !jsonRegex.test(contentType) || typeof c.validateData !== 'object') {
          break
        }
        value = c.validateData
        break
      case 'html':
        if (!contentType || !htmlRegex.test(contentType) || typeof c.validateData !== 'string') {
          break
        }
        value = c.validateData
        break
      case 'header':
        value = Object.fromEntries(c.res.headers.entries())
        break
      case 'cookie':
        value = c.res.headers.getSetCookie().reduce((acc, cookie) => {
          const [name, ...rest] = cookie.split('=')
          acc[name] = rest.join('=').split(';')[0]
          return acc
        }, {} as Record<string, string>)
        break
      case 'status':
        value = {
          ok: c.res.ok,
          status: c.res.status,
          statusText: c.res.statusText,
        }
        break
    }

    const res = await validationFunc(value as never, c as never)

    if (res instanceof Response) {
      c.res = res
    }
  }
}
