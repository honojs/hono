import type { Context } from '../context'
import type { Env, MiddlewareHandler, ResponseValidationTargets } from '../types'
import { UnofficialStatusCode } from '../utils/http-status'

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

    // ToDo: remove satisfies after
    switch (target) {
      case 'body':
        if (!c.res.body) {
          break
        }
        value = c.res.body satisfies ResponseValidationTargets['body']
        break
      case 'text':
        if (!contentType || !textRegex.test(contentType) || typeof c.validateData !== 'string') {
          break
        }
        value = c.validateData satisfies ResponseValidationTargets['text']
        break
      case 'json':
        if (!contentType || !jsonRegex.test(contentType) || typeof c.validateData !== 'object') {
          break
        }
        value = c.validateData satisfies ResponseValidationTargets['json']
        break
      case 'html':
        if (!contentType || !htmlRegex.test(contentType) || typeof c.validateData !== 'string') {
          break
        }
        value = c.validateData satisfies ResponseValidationTargets['html']
        break
      case 'header':
        value = Object.fromEntries(c.res.headers.entries()) as Record<
          string,
          string
        > satisfies ResponseValidationTargets['header']
        break
      case 'cookie':
        value = c.res.headers.getSetCookie().reduce((record, cookie) => {
          const [name, ...rest] = cookie.split('=')
          record[name] = rest.join('=').split(';')[0]
          return record
        }, {} as Record<string, string>) satisfies ResponseValidationTargets['cookie']
        break
      case 'status':
        value = {
          ok: c.res.ok,
          status: c.res.status as UnofficialStatusCode,
          statusText: c.res.statusText,
        } satisfies ResponseValidationTargets['status']
        break
    }

    const res = await validationFunc(value, c)

    if (res instanceof Response) {
      c.res = res
    }
  }
}
