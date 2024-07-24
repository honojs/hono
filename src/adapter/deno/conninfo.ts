import type { GetConnInfo } from '../../helper/conninfo'

/**
 * Get conninfo with Deno
 * @param c Context
 * @returns ConnInfo
 */
export const getConnInfo: GetConnInfo = (c) => {
  const { remoteAddr } = c.env
  return {
    remote: {
      address: remoteAddr.hostname,
      port: remoteAddr.port,
      transport: remoteAddr.transport,
    },
  }
}
