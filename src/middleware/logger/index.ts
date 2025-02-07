/**
 * @module
 * Logger Middleware for Hono.
 */

import type { MiddlewareHandler } from '../../types'
import { getColorEnabled } from '../../utils/color'

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

const trim = (str: string, maxLength: number) => {
  if (str.length > maxLength) {
    return str.slice(0, maxLength) + '...'
  }
  return str
}

function log(
  printFunc: PrintFunc,
  prefix: string,
  method: string,
  path: string,
  status: number = 0,
  maxLength: number = Infinity,
  elapsed?: string
) {
  const trimmedMethod = trim(method, maxLength)
  const trimmedPath = trim(path, maxLength)

  const out =
    prefix === LogPrefix.Incoming
      ? `${prefix} ${trimmedMethod} ${trimmedPath}`
      : `${prefix} ${trimmedMethod} ${trimmedPath} ${colorStatus(status)} ${elapsed}`
  printFunc(out)
}

type LoggerOptions = {
  printFunc?: PrintFunc
  maxLength?: number
}

/**
 * Logger Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/logger}
 *
 * @param {PrintFunc | LoggerOptions} [options=console.log] - Optional function for customized logging behavior or options for the logger middleware.
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
export const logger = (options: PrintFunc | LoggerOptions = console.log): MiddlewareHandler => {
  const { printFunc = console.log, maxLength = Infinity } =
    typeof options === 'function' ? { printFunc: options } : options

  return async function logger(c, next) {
    const { method, url } = c.req

    const path = url.slice(url.indexOf('/', 8))

    log(printFunc, LogPrefix.Incoming, method, path, maxLength)

    const start = Date.now()

    await next()

    log(printFunc, LogPrefix.Outgoing, method, path, c.res.status, maxLength, time(start))
  }
}
