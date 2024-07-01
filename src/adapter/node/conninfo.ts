import type { IncomingMessage } from 'node:http'
import type { AddressType, GetConnInfo } from '../../helper/conninfo'

/**
 * Get conninfo with Node.js
 * Assuming @hono/node-server, but if incoming is in c.env, it will work correctly on other servers.
 * @param c Context
 * @returns ConnInfo
 */
export const getConnInfo: GetConnInfo = (c) => {
  const { incoming } = c.env as { incoming: IncomingMessage }
  if (!incoming?.socket) {
    throw new Error('No socket available')
  }
  return {
    remote: {
      address: incoming.socket.remoteAddress,
      port: incoming.socket.remotePort,
      addressType: incoming.socket.remoteFamily as AddressType,
    },
  }
}
