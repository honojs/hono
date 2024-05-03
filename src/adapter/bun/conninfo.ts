// @denoify-ignore
import type { Context } from '../..'
import type { GetConnInfo } from '../../helper/conninfo'

/**
 * Get ConnInfo with Bun
 * @param c Context
 * @returns ConnInfo
 */
export const getConnInfo: GetConnInfo = (c: Context) => {
  const info = (
    c.env as {
      requestIP(req: Request): {
        address: string
        family: string
        port: number
      }
    }
  ).requestIP(c.req.raw)

  return {
    remote: {
      address: info.address,
      addressType: info.family === 'IPv6' || info.family === 'IPv4' ? info.family : 'unknown',
      port: info.port,
    },
  }
}
