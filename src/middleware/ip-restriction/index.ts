/**
 * Middleware for restrict IP Address
 * @module
 */

import type { Context, MiddlewareHandler } from '../..'
import type { AddressType, GetConnInfo } from '../../helper/conninfo'
import { createMiddleware } from '../../helper/factory'
import { HTTPException } from '../../http-exception'
import {
  convertIPv4ToBinary,
  convertIPv6ToBinary,
  distinctRemoteAddr,
  expandIPv6,
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
export type IPRestrictRule = string | ((addr: { addr: string; type: AddressType }) => boolean)

const IS_CIDR_NOTATION_REGEX = /\/[0-9]{0,3}$/
export const isMatchForRule = (
  remote: {
    addr: string
    type: AddressType
  },
  rule: IPRestrictRule
): boolean => {
  if (rule === '*') {
    // Match all
    return true
  }
  if (typeof rule === 'function') {
    return rule(remote)
  }
  if (IS_CIDR_NOTATION_REGEX.test(rule) && (remote.type === 'IPv4' || remote.type === 'IPv6')) {
    const isIPv4 = remote.type === 'IPv4'

    const splitedRule = rule.split('/')
    // CIDR
    const baseRuleAddr = splitedRule[0]
    if (distinctRemoteAddr(baseRuleAddr) !== remote.type) {
      return false
    }
    const prefix = parseInt(splitedRule[1])

    const addrToBinary = isIPv4 ? convertIPv4ToBinary : convertIPv6ToBinary

    const baseRuleMask = addrToBinary(baseRuleAddr)
    const remoteMask = addrToBinary(remote.addr)
    const mask = ((1n << BigInt(prefix)) - 1n) << BigInt((isIPv4 ? 32 : 128) - prefix)

    return (remoteMask & mask) === (baseRuleMask & mask)
  }

  const ruleAddrConnType = distinctRemoteAddr(rule)
  if (ruleAddrConnType === 'IPv4' || ruleAddrConnType === 'IPv6') {
    // Static
    if (ruleAddrConnType !== remote.type) {
      return false
    }
    if (remote.type === 'IPv6') {
      return expandIPv6(remote.addr) === expandIPv6(rule)
    }
    return rule === remote.addr // IPv4
  }
  throw new TypeError('Rule is unknown')
}

/**
 * Rules for IP Limit Middleware
 */
export interface IPRestrictRules {
  denyList?: IPRestrictRule[]
  allowList?: IPRestrictRule[]
}

/**
 * IP Limit Middleware
 *
 * @param getIP function to get IP Address
 */
export const ipRestriction = (
  getIP: GetIPAddr,
  { denyList = [], allowList = [] }: IPRestrictRules,
  onError?: (remote: { addr: string; type: AddressType }) => Response | Promise<Response>
): MiddlewareHandler => {
  const denyLength = denyList.length
  const allowLength = allowList.length

  const blockError = (): HTTPException =>
    new HTTPException(403, {
      res: new Response('Unauthorized', {
        status: 403,
      }),
    })

  return createMiddleware(async (c, next) => {
    const connInfo = getIP(c)
    const addr = typeof connInfo === 'string' ? connInfo : connInfo.remote.address
    if (!addr) {
      throw blockError()
    }
    const type =
      (typeof connInfo !== 'string' && connInfo.remote.addressType) || distinctRemoteAddr(addr)

    for (let i = 0; i < denyLength; i++) {
      const isValid = isMatchForRule({ type, addr }, denyList[i])
      if (isValid) {
        if (onError) {
          return onError({ type, addr })
        }
        throw blockError()
      }
    }
    for (let i = 0; i < allowLength; i++) {
      const isValid = isMatchForRule({ type, addr }, allowList[i])
      if (isValid) {
        return await next()
      }
    }

    if (allowLength === 0) {
      return await next()
    } else {
      if (onError) {
        return await onError({ addr, type })
      }
      throw blockError()
    }
  })
}
