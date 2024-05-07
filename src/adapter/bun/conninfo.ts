// @denoify-ignore
import type { Context } from '../..'
import type { GetConnInfo } from '../../helper/conninfo'

/**
 * Get ConnInfo with Bun
 * @param c Context
 * @returns ConnInfo
 */
export const getConnInfo: GetConnInfo = (c: Context) => {
  const server = ('server' in c.env ? c.env.server : c.env) as
    | {
        requestIP?: (req: Request) => {
          address: string
          family: string
          port: number
        }
      }
    | undefined

  if (!server) {
    throw new TypeError('env has to include the 2nd argument of fetch.')
  }
  if (typeof server.requestIP !== 'function') {
    throw new TypeError('server.requestIP is not a function.')
  }
  const info = server.requestIP(c.req.raw)

  return {
    remote: {
      address: info.address,
      addressType: info.family === 'IPv6' || info.family === 'IPv4' ? info.family : 'unknown',
      port: info.port,
    },
  }
}
