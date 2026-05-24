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
  if (IPV4_REGEX.test(sections.at(-1) as string)) {
    sections.splice(
      -1,
      1,
      ...convertIPv6BinaryToString(convertIPv4ToBinary(sections.at(-1) as string)) // => ::7f00:0001
        .substring(2) // => 7f00:0001
        .split(':') // => ['7f00', '0001']
    )
  }
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

const IPV4_OCTET_PART = '(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])'
const IPV4_REGEX = new RegExp(`^(?:${IPV4_OCTET_PART}\\.){3}${IPV4_OCTET_PART}$`)
export const INVALID_IP_ADDRESS_ERROR_CODE = 'ERR_INVALID_IP_ADDRESS'
export type InvalidIPAddressError = TypeError & {
  code: typeof INVALID_IP_ADDRESS_ERROR_CODE
}
const CHAR_CODE_0 = 48
const CHAR_CODE_9 = 57
const CHAR_CODE_A = 65
const CHAR_CODE_F = 70
const CHAR_CODE_a = 97
const CHAR_CODE_f = 102
const CHAR_CODE_DOT = 46
const CHAR_CODE_COLON = 58
const CHAR_CODE_PERCENT = 37

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
}

const createInvalidIPAddressError = (message: string): InvalidIPAddressError => {
  const error = new TypeError(message) as InvalidIPAddressError
  error.code = INVALID_IP_ADDRESS_ERROR_CODE
  return error
}

const throwInvalidIPv4Address = (ipv4: string): never => {
  throw createInvalidIPAddressError(`Invalid IPv4 address: ${ipv4}`)
}

const throwInvalidIPv6Address = (ipv6: string): never => {
  throw createInvalidIPAddressError(`Invalid IPv6 address: ${ipv6}`)
}

const parseIPv4ToBinary = (
  ipv4: string,
  start: number,
  end: number,
  onInvalid: () => never
): bigint => {
  let result = 0n
  let octets = 0
  let octet = 0
  let digits = 0
  let firstDigit = 0

  for (let i = start; i <= end; i++) {
    const code = i < end ? ipv4.charCodeAt(i) : CHAR_CODE_DOT
    if (code >= CHAR_CODE_0 && code <= CHAR_CODE_9) {
      if (digits === 0) {
        firstDigit = code
      } else if (firstDigit === CHAR_CODE_0) {
        onInvalid()
      }
      octet = octet * 10 + code - CHAR_CODE_0
      if (octet > 255) {
        onInvalid()
      }
      digits++
      continue
    }

    if (code !== CHAR_CODE_DOT || digits === 0 || octets === 4) {
      onInvalid()
    }

    result = (result << 8n) + BigInt(octet)
    octets++
    octet = 0
    digits = 0
  }

  if (octets !== 4) {
    onInvalid()
  }

  return result
}

const parseIPv6HexCode = (code: number): number => {
  if (code >= CHAR_CODE_0 && code <= CHAR_CODE_9) {
    return code - CHAR_CODE_0
  }
  if (code >= CHAR_CODE_A && code <= CHAR_CODE_F) {
    return code - CHAR_CODE_A + 10
  }
  if (code >= CHAR_CODE_a && code <= CHAR_CODE_f) {
    return code - CHAR_CODE_a + 10
  }
  return -1
}

const isIPv6LinkLocal = (ipv6binary: bigint): boolean => ipv6binary >> 118n === 0x3fan

/**
 * Convert IPv4 to Uint8Array
 * @param ipv4 IPv4 Address
 * @returns BigInt
 */
export const convertIPv4ToBinary = (ipv4: string): bigint => {
  return parseIPv4ToBinary(ipv4, 0, ipv4.length, () => throwInvalidIPv4Address(ipv4))
}

/**
 * Convert IPv6 to Uint8Array
 * @param ipv6 IPv6 Address
 * @returns BigInt
 */
export const convertIPv6ToBinary = (ipv6: string): bigint => {
  const length = ipv6.length
  const sections: number[] = []
  let hasZoneId = false
  let compressAt = -1
  let index = 0

  if (length === 0) {
    throwInvalidIPv6Address(ipv6)
  }

  while (index < length) {
    if (sections.length > 8) {
      throwInvalidIPv6Address(ipv6)
    }

    let code = ipv6.charCodeAt(index)

    if (code === CHAR_CODE_PERCENT) {
      if (index + 1 === length) {
        throwInvalidIPv6Address(ipv6)
      }
      hasZoneId = true
      break
    }

    if (code === CHAR_CODE_COLON) {
      if (index + 1 < length && ipv6.charCodeAt(index + 1) === CHAR_CODE_COLON) {
        if (compressAt !== -1) {
          throwInvalidIPv6Address(ipv6)
        }
        compressAt = sections.length
        index += 2
        continue
      }
      throwInvalidIPv6Address(ipv6)
    }

    let value = 0
    let digits = 0
    const sectionStart = index

    while (index < length) {
      code = ipv6.charCodeAt(index)
      const hex = parseIPv6HexCode(code)
      if (hex === -1) {
        break
      }
      if (digits === 4) {
        throwInvalidIPv6Address(ipv6)
      }
      value = (value << 4) | hex
      digits++
      index++
    }

    if (index < length && ipv6.charCodeAt(index) === CHAR_CODE_DOT) {
      let ipv4End = length
      for (let i = index; i < length; i++) {
        if (ipv6.charCodeAt(i) === CHAR_CODE_PERCENT) {
          if (i + 1 === length) {
            throwInvalidIPv6Address(ipv6)
          }
          hasZoneId = true
          ipv4End = i
          break
        }
      }
      const ipv4 = parseIPv4ToBinary(ipv6, sectionStart, ipv4End, () =>
        throwInvalidIPv6Address(ipv6)
      )
      sections.push(Number((ipv4 >> 16n) & 0xffffn), Number(ipv4 & 0xffffn))
      index = length
      break
    }

    if (digits === 0) {
      throwInvalidIPv6Address(ipv6)
    }

    sections.push(value)

    if (index === length) {
      break
    }

    code = ipv6.charCodeAt(index)
    if (code === CHAR_CODE_PERCENT) {
      if (index + 1 === length) {
        throwInvalidIPv6Address(ipv6)
      }
      hasZoneId = true
      break
    }

    if (code !== CHAR_CODE_COLON) {
      throwInvalidIPv6Address(ipv6)
    }

    if (index + 1 < length && ipv6.charCodeAt(index + 1) === CHAR_CODE_COLON) {
      if (compressAt !== -1) {
        throwInvalidIPv6Address(ipv6)
      }
      compressAt = sections.length
      index += 2
      continue
    }

    index++
    if (index === length) {
      throwInvalidIPv6Address(ipv6)
    }
  }

  if (compressAt === -1 ? sections.length !== 8 : sections.length >= 8) {
    throwInvalidIPv6Address(ipv6)
  }

  let result = 0n
  const zeros = compressAt === -1 ? 0 : 8 - sections.length
  const firstSectionEnd = compressAt === -1 ? sections.length : compressAt
  for (let i = 0; i < firstSectionEnd; i++) {
    result <<= 16n
    result += BigInt(sections[i])
  }
  for (let i = 0; i < zeros; i++) {
    result <<= 16n
  }
  for (let i = firstSectionEnd; i < sections.length; i++) {
    result <<= 16n
    result += BigInt(sections[i])
  }
  if (hasZoneId && !isIPv6LinkLocal(result)) {
    throwInvalidIPv6Address(ipv6)
  }
  return result
}

/**
 * Convert a binary representation of an IPv4 address to a string.
 * @param ipV4 binary IPv4 Address
 * @return IPv4 Address in string
 */
export const convertIPv4BinaryToString = (ipV4: bigint): string => {
  const sections = []
  for (let i = 0; i < 4; i++) {
    sections.push((ipV4 >> BigInt(8 * (3 - i))) & 0xffn)
  }
  return sections.join('.')
}

/**
 * Check if a binary IPv6 address is an IPv4-mapped IPv6 address (::ffff:x.x.x.x)
 * @param ipv6binary binary IPv6 Address
 * @return true if the address is an IPv4-mapped IPv6 address
 */
export const isIPv4MappedIPv6 = (ipv6binary: bigint): boolean => ipv6binary >> 32n === 0xffffn

/**
 * Extract the IPv4 portion from an IPv4-mapped IPv6 address
 * @param ipv6binary binary IPv4-mapped IPv6 Address
 * @return binary IPv4 Address
 */
export const convertIPv4MappedIPv6ToIPv4 = (ipv6binary: bigint): bigint => ipv6binary & 0xffffffffn

/**
 * Convert a binary representation of an IPv6 address to a string.
 * @param ipV6 binary IPv6 Address
 * @return normalized IPv6 Address in string
 */
export const convertIPv6BinaryToString = (ipV6: bigint): string => {
  if (isIPv4MappedIPv6(ipV6)) {
    return `::ffff:${convertIPv4BinaryToString(convertIPv4MappedIPv6ToIPv4(ipV6))}`
  }

  const sections = []
  for (let i = 0; i < 8; i++) {
    sections.push(((ipV6 >> BigInt(16 * (7 - i))) & 0xffffn).toString(16))
  }

  let currentZeroStart = -1
  let maxZeroStart = -1
  let maxZeroEnd = -1
  for (let i = 0; i < 8; i++) {
    if (sections[i] === '0') {
      if (currentZeroStart === -1) {
        currentZeroStart = i
      }
    } else {
      if (currentZeroStart > -1) {
        if (i - currentZeroStart > maxZeroEnd - maxZeroStart) {
          maxZeroStart = currentZeroStart
          maxZeroEnd = i
        }
        currentZeroStart = -1
      }
    }
  }
  if (currentZeroStart > -1) {
    if (8 - currentZeroStart > maxZeroEnd - maxZeroStart) {
      maxZeroStart = currentZeroStart
      maxZeroEnd = 8
    }
  }
  // RFC 5952 4.2.2: "::" MUST NOT be used to shorten just one 16-bit 0 field.
  if (maxZeroStart !== -1 && maxZeroEnd - maxZeroStart > 1) {
    sections.splice(maxZeroStart, maxZeroEnd - maxZeroStart, ':')
  }

  return sections.join(':').replace(/:{2,}/g, '::')
}
