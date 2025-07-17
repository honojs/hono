import type { Context } from '../..'
import type { GetConnInfo } from '../../helper/conninfo'

/**
 * Get ConnInfo with Moddable
 * @param c Context
 * @returns ConnInfo
 */
export const getConnInfo: GetConnInfo = (c: Context) => {
  const socket = c.env.socket as {
    get: (type: 'REMOTE_IP') => string | undefined
  } | undefined

  if (!socket) {
    throw new TypeError('env has to include the socket object.')
  }

  const addr = socket.get('REMOTE_IP')
  if (!addr) {
    return {
      remote: {}
    }
  }
  return {
    remote: {
      address: addr,
      transport: 'tcp',
    },
  }
}
