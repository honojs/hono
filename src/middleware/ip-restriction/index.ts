/**
 * IP Restriction Middleware for Hono
 * @module
 */

import type { Context, MiddlewareHandler } from '../..'
import type { AddressType, GetConnInfo } from '../../helper/conninfo'
import { HTTPException } from '../../http-exception'
import {
  convertIPv4ToBinary,
  convertIPv6BinaryToString,
  convertIPv6ToBinary,
  distinctRemoteAddr,
} from '../../utils/ipaddr'

/**
 * Function to get IP Address
 */
type GetIPAddr = GetConnInfo | ((c: Context) => string)

/**
 * ### IPv4 and IPv6
 * - `*` match all
 *
 * ### IPv4
 * - `192.168.2.0` static
 * - `192.168.2.0/24` CIDR Notation
 *
 * ### IPv6
 * - `::1` static
 * - `::1/10` CIDR Notation
 */
type IPRestrictionRuleFunction = (addr: { addr: string; type: AddressType }) => boolean
export type IPRestrictionRule = string | ((addr: { addr: string; type: AddressType }) => boolean)

const IS_CIDR_NOTATION_REGEX = /\/[0-9]{0,3}$/
const buildMatcher = (
  rules: IPRestrictionRule[]
): ((addr: { addr: string; type: AddressType; isIPv4: boolean }) => boolean) => {
  const functionRules: IPRestrictionRuleFunction[] = []
  const staticRules: Set<string> = new Set()
  const cidrRules: [boolean, bigint, bigint][] = []

  for (let rule of rules) {
    if (rule === '*') {
      return () => true
    } else if (typeof rule === 'function') {
      functionRules.push(rule)
    } else {
      if (IS_CIDR_NOTATION_REGEX.test(rule)) {
        const separatedRule = rule.split('/')

        const addrStr = separatedRule[0]
        const type = distinctRemoteAddr(addrStr)
        if (type === undefined) {
          throw new TypeError(`Invalid rule: ${rule}`)
        }

        const isIPv4 = type === 'IPv4'
        const prefix = parseInt(separatedRule[1])

        if (isIPv4 ? prefix === 32 : prefix === 128) {
          // this rule is a static rule
          rule = addrStr
        } else {
          const addr = (isIPv4 ? convertIPv4ToBinary : convertIPv6ToBinary)(addrStr)
          const mask = ((1n << BigInt(prefix)) - 1n) << BigInt((isIPv4 ? 32 : 128) - prefix)

          cidrRules.push([isIPv4, addr & mask, mask] as [boolean, bigint, bigint])
          continue
        }
      }

      const type = distinctRemoteAddr(rule)
      if (type === undefined) {
        throw new TypeError(`Invalid rule: ${rule}`)
      }
      staticRules.add(
        type === 'IPv4'
          ? rule // IPv4 address is already normalized, so it is registered as is.
          : convertIPv6BinaryToString(convertIPv6ToBinary(rule)) // normalize IPv6 address (e.g. 0000:0000:0000:0000:0000:0000:0000:0001 => ::1)
      )
    }
  }

  return (remote: {
    addr: string
    type: AddressType
    isIPv4: boolean
    binaryAddr?: bigint
  }): boolean => {
    if (staticRules.has(remote.addr)) {
      return true
    }
    for (const [isIPv4, addr, mask] of cidrRules) {
      if (isIPv4 !== remote.isIPv4) {
        continue
      }
      const remoteAddr = (remote.binaryAddr ||= (
        isIPv4 ? convertIPv4ToBinary : convertIPv6ToBinary
      )(remote.addr))
      if ((remoteAddr & mask) === addr) {
        return true
      }
    }
    for (const rule of functionRules) {
      if (rule({ addr: remote.addr, type: remote.type })) {
        return true
      }
    }
    return false
  }
}

/**
 * Rules for IP Restriction Middleware
 */
export interface IPRestrictionRules {
  denyList?: IPRestrictionRule[]
  allowList?: IPRestrictionRule[]
}

/**
 * IP Restriction Middleware
 *
 * @param getIP function to get IP Address
 */
export const ipRestriction = (
  getIP: GetIPAddr,
  { denyList = [], allowList = [] }: IPRestrictionRules,
  onError?: (
    remote: { addr: string; type: AddressType },
    c: Context
  ) => Response | Promise<Response>
): MiddlewareHandler => {
  const allowLength = allowList.length

  const denyMatcher = buildMatcher(denyList)
  const allowMatcher = buildMatcher(allowList)

  const blockError = (c: Context): HTTPException =>
    new HTTPException(403, {
      res: c.text('Forbidden', {
        status: 403,
      }),
    })

  return async function ipRestriction(c, next) {
    const connInfo = getIP(c)
    const addr = typeof connInfo === 'string' ? connInfo : connInfo.remote.address
    if (!addr) {
      throw blockError(c)
    }
    const type =
      (typeof connInfo !== 'string' && connInfo.remote.addressType) || distinctRemoteAddr(addr)

    const remoteData = { addr, type, isIPv4: type === 'IPv4' }

    if (denyMatcher(remoteData)) {
      if (onError) {
        return onError({ addr, type }, c)
      }
      throw blockError(c)
    }
    if (allowMatcher(remoteData)) {
      return await next()
    }

    if (allowLength === 0) {
      return await next()
    } else {
      if (onError) {
        return await onError({ addr, type }, c)
      }
      throw blockError(c)
    }
  }
}
