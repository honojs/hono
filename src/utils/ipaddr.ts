/**
 * Utils for IP Addresses
 * @module
 */

import type { AddressType } from '../helper/conninfo'

/**
 * Expand IPv6 Address
 * @param ipV6 Shorten IPv6 Address
 * @return expanded IPv6 Address
 */
export const expandIPv6 = (ipV6: string): string => {
  const sections = ipV6.split(':')
  for (let i = 0; i < sections.length; i++) {
    const node = sections[i]
    if (node !== '') {
      sections[i] = node.padStart(4, '0')
    } else {
      sections[i + 1] === '' && sections.splice(i + 1, 1)
      sections[i] = new Array(8 - sections.length + 1).fill('0000').join(':')
    }
  }
  return sections.join(':')
}

const IPV4_REGEX = /^[0-9]{0,3}\.[0-9]{0,3}\.[0-9]{0,3}\.[0-9]{0,3}$/

/**
 * Distinct Remote Addr
 * @param remoteAddr Remote Addr
 */
export const distinctRemoteAddr = (remoteAddr: string): AddressType => {
  if (IPV4_REGEX.test(remoteAddr)) {
    return 'IPv4'
  }
  if (remoteAddr.includes(':')) {
    // Domain can't include `:`
    return 'IPv6'
  }
  return 'unknown'
}

/**
 * Convert IPv4 to Uint8Array
 * @param ipV4 IPv4 Address
 * @returns BigInt
 */
export const convertIPv4ToBinary = (ipV4: string): bigint => {
  const parts = ipV4.split('.')
  let result = 0n
  for (let i = 0; i < 4; i++) {
    result <<= 8n
    result += BigInt(parts[i])
  }
  return result
}

/**
 * Convert IPv6 to Uint8Array
 * @param ipV6 IPv6 Address
 * @returns BigInt
 */
export const convertIPv6ToBinary = (ipV6: string): bigint => {
  const sections = expandIPv6(ipV6).split(':')
  let result = 0n
  for (let i = 0; i < 8; i++) {
    result <<= 16n
    result += BigInt(parseInt(sections[i], 16))
  }
  return result
}
