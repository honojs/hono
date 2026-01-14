/**
 * @module
 * Logger Middleware for Hono.
 */

import type { MiddlewareHandler } from '../../types'
import { getColorEnabledAsync } from '../../utils/color'

enum LogPrefix {
  Outgoing = '-->',
  Incoming = '<--',
  Error = 'xxx',
}

const humanize = (times: string[]): string => {
  const [delimiter, separator] = [',', '.']

  const orderTimes = times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + delimiter))

  return orderTimes.join(separator)
}

const time = (start: number): string => {
  const delta = Date.now() - start
  return humanize([delta < 1000 ? delta + 'ms' : Math.round(delta / 1000) + 's'])
}

const colorStatus = async (status: number): Promise<string> => {
  const colorEnabled = await getColorEnabledAsync()
  if (colorEnabled) {
    switch ((status / 100) | 0) {
      case 5: // red = error
        return `\x1b[31m${status}\x1b[0m`
      case 4: // yellow = warning
        return `\x1b[33m${status}\x1b[0m`
      case 3: // cyan = redirect
        return `\x1b[36m${status}\x1b[0m`
      case 2: // green = success
        return `\x1b[32m${status}\x1b[0m`
    }
  }
  // Fallback to unsupported status code.
  // E.g.) Bun and Deno supports new Response with 101, but Node.js does not.
  // And those may evolve to accept more status.
  return `${status}`
}

type PrintFunc = (str: string, ...rest: string[]) => void

async function log(
  fn: PrintFunc,
  prefix: string,
  method: string,
  path: string,
  status: number = 0,
  elapsed?: string
): Promise<void> {
  const out =
    prefix === LogPrefix.Incoming
      ? `${prefix} ${method} ${path}`
      : `${prefix} ${method} ${path} ${await colorStatus(status)} ${elapsed}`
  fn(out)
}

/**
 * Logger Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/logger}
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
    const { method, url } = c.req

    const path = url.slice(url.indexOf('/', 8))

    await log(fn, LogPrefix.Incoming, method, path)

    const start = Date.now()

    await next()

    await log(fn, LogPrefix.Outgoing, method, path, c.res.status, time(start))
  }
}
