import type { Context } from '../..'
import type { AddressType, GetConnInfo } from '../../helper/conninfo'
import { getAntServer } from './server'

const getAddressType = (address: string): AddressType => {
  if (address.includes(':')) {
    return 'IPv6'
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) {
    return 'IPv4'
  }
  return undefined
}

/**
 * Get ConnInfo with Ant
 * @param c Context
 * @returns ConnInfo
 */
export const getConnInfo: GetConnInfo = (c: Context) => {
  const server = getAntServer<{
    requestIP?: (req: Request) => {
      address: string
      port: number
    } | null
  }>(c)

  if (!server) {
    throw new TypeError('env has to include the 2nd argument of fetch.')
  }
  if (typeof server.requestIP !== 'function') {
    throw new TypeError('server.requestIP is not a function.')
  }

  // returns null for closed requests or unix domain sockets
  const info = server.requestIP(c.req.raw)

  if (!info) {
    return { remote: {} }
  }

  return {
    remote: {
      address: info.address,
      addressType: getAddressType(info.address),
      port: info.port,
    },
  }
}
