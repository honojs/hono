import type { Context } from '../..'
import type { GetConnInfo } from '../../helper/conninfo'
import { getBunServer } from './server'

/**
 * Get ConnInfo with Bun
 * @param c Context
 * @returns ConnInfo
 */
export const getConnInfo: GetConnInfo = (c: Context) => {
  const server = getBunServer<{
    requestIP?: (req: Request) => {
      address: string
      family: string
      port: number
    } | null
  }>(c)

  if (!server) {
    throw new TypeError('env has to include the 2nd argument of fetch.')
  }
  if (typeof server.requestIP !== 'function') {
    throw new TypeError('server.requestIP is not a function.')
  }

  // https://bun.sh/docs/runtime/http/server#server-requestip-request
  // Returns null for closed requests or Unix domain sockets.
  const info = server.requestIP(c.req.raw)

  if (!info) {
    return {
      remote: {},
    }
  }

  return {
    remote: {
      address: info.address,
      addressType: info.family === 'IPv6' || info.family === 'IPv4' ? info.family : undefined,
      port: info.port,
    },
  }
}
