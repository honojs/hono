import { getPathFromURL } from '../../utils/url'
import type { Context } from '../../context'

const humanize = (
  n: string[],
  opts?: { delimiter?: string; separator?: string }
) => {
  const options = opts || {}
  const d = options.delimiter || ','
  const s = options.separator || '.'
  n = n.toString().split('.')
  n[0] = n[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + d)
  return n.join(s)
}

const time = (start: number) => {
  const delta = Date.now() - start
  return humanize([
    delta < 10000 ? delta + 'ms' : Math.round(delta / 1000) + 's',
  ])
}

const LogPrefix = {
  Outgoing: '-->',
  Incoming: '<--',
  Error: 'xxx',
}

const colorStatus = (status: number = 0) => {
  const out: { [key: number]: string } = {
    7: `\x1b[35m${status}\x1b[0m`,
    5: `\x1b[31m${status}\x1b[0m`,
    4: `\x1b[33m${status}\x1b[0m`,
    3: `\x1b[36m${status}\x1b[0m`,
    2: `\x1b[32m${status}\x1b[0m`,
    1: `\x1b[32m${status}\x1b[0m`,
    0: `\x1b[33m${status}\x1b[0m`,
  }
  return out[(status / 100) | 0]
}
type PrintFunc = (str: string, ...rest: string[]) => void;

function log(
  fn: PrintFunc,
  prefix: string,
  method: string,
  path: string,
  status?: number,
  elasped?: string
) {
  const out =
    prefix === LogPrefix.Incoming
      ? `  ${prefix} ${method} ${path}`
      : `  ${prefix} ${method} ${path} ${colorStatus(status)} ${elasped}`
  fn(out)
}

export const logger = (fn = console.log) => {
  return async (c: Context, next: Function) => {
    const { method } = c.req
    const path = getPathFromURL(c.req.url)

    log(fn, LogPrefix.Incoming, method, path)

    const start = Date.now()

    try {
      await next()
    } catch (e) {
      log(fn, LogPrefix.Error, method, path, c.res.status || 500, time(start))
      throw e
    }

    log(fn, LogPrefix.Outgoing, method, path, c.res.status, time(start))
  }
}
