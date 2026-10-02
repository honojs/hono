import type { Context } from '../../context'
import type { AddressType, GetConnInfo } from '../../helper/conninfo'
import type { SocketBindings } from './types'

const parseAddress = (
  remoteAddress: string
): { address: string; port?: number; addressType: AddressType } => {
  // [::1]:8080
  const bracketed = /^\[([^\]]+)\](?::(\d+))?$/.exec(remoteAddress)
  if (bracketed) {
    return {
      address: bracketed[1],
      port: bracketed[2] ? Number(bracketed[2]) : undefined,
      addressType: 'IPv6',
    }
  }
  const colons = remoteAddress.split(':').length - 1
  if (colons > 1) {
    // an IPv6 address without a port
    return { address: remoteAddress, addressType: 'IPv6' }
  }
  const [address, port] = remoteAddress.split(':')
  return {
    address,
    port: port ? Number(port) : undefined,
    addressType: /^\d{1,3}(?:\.\d{1,3}){3}$/.test(address) ? 'IPv4' : undefined,
  }
}

/**
 * Get ConnInfo with the WinterTC Sockets adapter.
 * Reads `remoteAddress` of the `SocketInfo` that `socket.opened` resolved with.
 * @param c Context
 * @returns ConnInfo
 */
export const getConnInfo: GetConnInfo = (c: Context) => {
  const remoteAddress = (c.env as Partial<SocketBindings> | undefined)?.info?.remoteAddress
  if (!remoteAddress) {
    return {
      remote: {},
    }
  }
  const { address, port, addressType } = parseAddress(remoteAddress)
  return {
    remote: {
      transport: 'tcp',
      address,
      addressType,
      ...(port === undefined ? {} : { port }),
    },
  }
}
