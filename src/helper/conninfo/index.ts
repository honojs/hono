import type { Context } from '../../context'

export type AddressType = 'IPv6' | 'IPv4' | 'unknown'

export type NetAddrInfo = {
  /**
   * Transport protocol type
   */
  transport?: 'tcp' | 'udp'
  /**
   * Transport port number
   */
  port?: number

  address?: string
  addressType?: AddressType
} & ({
  /**
   * Host name such as IP Addr
   */
  address: string

  /**
   * Host name type
   */
  addressType: AddressType
} | {})

/**
 * HTTP Connection infomation
 */
export interface ConnInfo {
  /**
   * Remote infomation
   */
  remote: NetAddrInfo
}

/**
 * Helper type
 */
export type GetConnInfo = (c: Context) => ConnInfo
