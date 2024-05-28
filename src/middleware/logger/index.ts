/**
 * @module
 * Logger Middleware for Hono.
 */

import type { MiddlewareHandler } from '../../types'
import { getColorEnabled } from '../../utils/color'
import { getPath } from '../../utils/url'

enum LogPrefix {
  Outgoing = '-->',
  Incoming = '<--',
  Error = 'xxx',
}

const humanize = (times: string[]) => {
  const [delimiter, separator] = [',', '.']

  const orderTimes = times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + delimiter))

  return orderTimes.join(separator)
}

const time = (start: number) => {
  const delta = Date.now() - start
  return humanize([delta < 1000 ? delta + 'ms' : Math.round(delta / 1000) + 's'])
}

const colorStatus = (status: number) => {
  const colorEnabled = getColorEnabled()
  const out: { [key: string]: string } = {
    7: colorEnabled ? `\x1b[35m${status}\x1b[0m` : `${status}`,
    5: colorEnabled ? `\x1b[31m${status}\x1b[0m` : `${status}`,
    4: colorEnabled ? `\x1b[33m${status}\x1b[0m` : `${status}`,
    3: colorEnabled ? `\x1b[36m${status}\x1b[0m` : `${status}`,
    2: colorEnabled ? `\x1b[32m${status}\x1b[0m` : `${status}`,
    1: colorEnabled ? `\x1b[32m${status}\x1b[0m` : `${status}`,
    0: colorEnabled ? `\x1b[33m${status}\x1b[0m` : `${status}`,
  }

  const calculateStatus = (status / 100) | 0

  return out[calculateStatus]
}

type PrintFunc = (str: string, ...rest: string[]) => void

function log(
  fn: PrintFunc,
  prefix: string,
  method: string,
  path: string,
  status: number = 0,
  elapsed?: string
) {
  const out =
    prefix === LogPrefix.Incoming
      ? `  ${prefix} ${method} ${path}`
      : `  ${prefix} ${method} ${path} ${colorStatus(status)} ${elapsed}`
  fn(out)
}

/**
 * Logger Middleware for Hono.
 *
 * @see {@link https://hono.dev/middleware/builtin/logger}
 *
 * @param {PrintFunc} [fn=console.log] - Optional function for customized logging behavior.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use(logger())
 * app.get('/', (c) => c.text('Hello Hono!'))
 * ```
 */
export const logger = (fn: PrintFunc = console.log): MiddlewareHandler => {
  return async function logger(c, next) {
    const { method } = c.req
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const path = getPath(c.req.raw)

    log(fn, LogPrefix.Incoming, method, path)

    const start = Date.now()

    await next()

    log(fn, LogPrefix.Outgoing, method, path, c.res.status, time(start))
  }
}
