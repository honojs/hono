import type { Context } from '../context'
import type { Env, MiddlewareHandler, ResponseValidationTargets } from '../types'

type ResponseValidationTargetKeys = keyof ResponseValidationTargets

export type ResponseValidationFunction<
  U extends ResponseValidationTargetKeys,
  E extends Env = {},
  P extends string = string
> = (
  value: ResponseValidationTargets[U],
  c: Context<E, P>
) => undefined | Response | Promise<Response>

const textRegex = /^text\/([a-z-\.]+\+)?(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/
const jsonRegex = /^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/
const htmlRegex = /^text\/html(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/

export const responseValidator = <
  P extends string,
  U extends ResponseValidationTargetKeys,
  P2 extends string = P,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Env = any
>(
  target: U,
  validationFunc: ResponseValidationFunction<U, E, P2>
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
        if (!c.res.body) {
          break
        }
        value = c.res.body
        break
      case 'text':
        if (!contentType || !textRegex.test(contentType) || typeof c.validateData !== 'string') {
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
        value = Object.fromEntries(c.res.headers.entries()) as Record<string, string>
        break
      case 'cookie':
        value = c.res.headers.getSetCookie().reduce((record, cookie) => {
          const [name, ...rest] = cookie.split('=')
          record[name] = rest.join('=').split(';')[0]
          return record
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

    const res = await validationFunc(value, c)

    if (res instanceof Response) {
      c.res = res
    }
  }
}
