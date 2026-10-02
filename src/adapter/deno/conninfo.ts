import type { GetConnInfo } from '../../helper/conninfo'

/**
 * Get conninfo with Deno
 * @param c Context
 * @returns ConnInfo
 * @deprecated `hono/deno` will be removed in v5. Install `@hono/deno` and import from there instead.
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
