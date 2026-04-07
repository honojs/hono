/**
 * IP Restriction Middleware for Hono
 * @module
 */

import type { Context, MiddlewareHandler } from '../..'
import type { AddressType, GetConnInfo } from '../../helper/conninfo'
import { HTTPException } from '../../http-exception'
import {
  convertIPv4MappedIPv6ToIPv4,
  convertIPv4ToBinary,
  convertIPv6BinaryToString,
  convertIPv6ToBinary,
  distinctRemoteAddr,
  isIPv4MappedIPv6,
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

        let isIPv4 = type === 'IPv4'
        let prefix = parseInt(separatedRule[1])

        if (isIPv4 ? prefix === 32 : prefix === 128) {
          // this rule is a static rule
          rule = addrStr
        } else {
          let addr = (isIPv4 ? convertIPv4ToBinary : convertIPv6ToBinary)(addrStr)
          if (type === 'IPv6' && isIPv4MappedIPv6(addr) && prefix >= 96) {
            isIPv4 = true
            addr = convertIPv4MappedIPv6ToIPv4(addr)
            prefix -= 96
          }

          const mask = ((1n << BigInt(prefix)) - 1n) << BigInt((isIPv4 ? 32 : 128) - prefix)

          cidrRules.push([isIPv4, addr & mask, mask] as [boolean, bigint, bigint])
          continue
        }
      }

      const type = distinctRemoteAddr(rule)
      if (type === undefined) {
        throw new TypeError(`Invalid rule: ${rule}`)
      }
      if (type === 'IPv4') {
        staticRules.add(rule)
        staticRules.add(`::ffff:${rule}`)
      } else {
        const ipv6binary = convertIPv6ToBinary(rule)
        const ipv6Addr = convertIPv6BinaryToString(ipv6binary)
        staticRules.add(ipv6Addr)
        if (isIPv4MappedIPv6(ipv6binary)) {
          staticRules.add(ipv6Addr.substring(7)) // remove ::ffff: prefix
        }
      }
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
    const remoteAddr = (remote.binaryAddr ||= (
      remote.isIPv4 ? convertIPv4ToBinary : convertIPv6ToBinary
    )(remote.addr))
    const remoteIPv4Addr =
      remote.isIPv4 || isIPv4MappedIPv6(remoteAddr)
        ? remote.isIPv4
          ? remoteAddr
          : convertIPv4MappedIPv6ToIPv4(remoteAddr)
        : undefined
    for (const [isIPv4, addr, mask] of cidrRules) {
      if (isIPv4) {
        if (remoteIPv4Addr === undefined) {
          continue
        }
        if ((remoteIPv4Addr & mask) === addr) {
          return true
        }
        continue
      }
      if (remote.isIPv4) {
        continue
      }
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
 * IP Restriction Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/ip-restriction}
 *
 * @param {GetConnInfo | ((c: Context) => string)} getIP - A function to retrieve the client IP address. Use `getConnInfo` from the appropriate runtime adapter.
 * @param {IPRestrictionRules} rules - An object with optional `denyList` and `allowList` arrays of IP rules. Each rule can be a static IP, a CIDR range, or a custom function.
 * @param {(remote: { addr: string; type: AddressType }, c: Context) => Response | Promise<Response>} [onError] - Optional custom handler invoked when a request is blocked. Defaults to returning a 403 Forbidden response.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { ipRestriction } from 'hono/ip-restriction'
 * import { getConnInfo } from 'hono/cloudflare-workers'
 *
 * const app = new Hono()
 *
 * app.use(
 *   '*',
 *   ipRestriction(getConnInfo, {
 *     // Block a specific IP and an entire subnet
 *     denyList: ['192.168.0.5', '10.0.0.0/8'],
 *     // Only allow requests from localhost and a private range
 *     allowList: ['127.0.0.1', '::1', '192.168.1.0/24'],
 *   })
 * )
 *
 * // With a custom error handler
 * app.use(
 *   '/admin/*',
 *   ipRestriction(
 *     getConnInfo,
 *     { allowList: ['203.0.113.0/24'] },
 *     (remote, c) => c.text(`Access denied for ${remote.addr}`, 403)
 *   )
 * )
 *
 * app.get('/', (c) => c.text('Hello!'))
 * ```
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
