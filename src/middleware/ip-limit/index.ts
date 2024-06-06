/**
 * Middleware for Limiting IP Address
 * @module
 */

import type { MiddlewareHandler } from '../..'
import type { AddressType, GetConnInfo } from '../../helper/conninfo'
import { createMiddleware } from '../../helper/factory'
import { HTTPException } from '../../http-exception'
import {
  distinctRemoteAddr,
  expandIPv6,
  convertIPv4ToBinary,
  convertIPv6ToBinary,
} from '../../utils/ipaddr'

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
export type IPLimitRule = string

const IS_CIDR_NOTATION_REGEX = /\/[0-9]{0,3}$/
export const isMatchForRule = (
  remote: {
    addr: string
    type: AddressType
  },
  rule: IPLimitRule
): boolean => {
  if (rule === '*') {
    // Match all
    return true
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
export interface IPLimitRules {
  deny?: IPLimitRule[]
  allow?: IPLimitRule[]
}

/**
 * IP Limit Middleware
 *
 * @param getConnInfo getConnInfo helper
 */
export const ipLimit = (
  getConnInfo: GetConnInfo,
  { deny = [], allow = [] }: IPLimitRules
): MiddlewareHandler => {
  const denyLength = deny.length
  const allowLength = allow.length

  const blockError = (): HTTPException =>
    new HTTPException(403, {
      res: new Response('Unauthorized', {
        status: 403,
      }),
    })

  return createMiddleware(async (c, next) => {
    const connInfo = getConnInfo(c)
    const addr = connInfo.remote.address
    if (!addr) {
      throw blockError()
    }
    const type = connInfo.remote.addressType ?? distinctRemoteAddr(addr)

    for (let i = 0; i < denyLength; i++) {
      const isValid = isMatchForRule({ type, addr }, deny[i])
      if (isValid) {
        throw blockError()
      }
    }
    for (let i = 0; i < allowLength; i++) {
      const isValid = isMatchForRule({ type, addr }, allow[i])
      if (isValid) {
        return await next()
      }
    }

    if (allowLength === 0) {
      return await next()
    } else {
      throw blockError()
    }
  })
}
