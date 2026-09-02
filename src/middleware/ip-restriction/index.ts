/**
 * IP Restriction Middleware for Hono
 * @module
 */

import type { Context, MiddlewareHandler } from '../..'
import type { AddressType, GetConnInfo } from '../../helper/conninfo'
import { HTTPException } from '../../http-exception'
import type { InvalidIPAddressError } from '../../utils/ipaddr'
import {
  convertIPv4MappedIPv6ToIPv4,
  convertIPv4ToBinary,
  convertIPv6BinaryToString,
  convertIPv6ToBinary,
  distinctRemoteAddr,
  isIPv4MappedIPv6,
  INVALID_IP_ADDRESS_ERROR_CODE,
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

/**
 * The IP address of the remote host used when matching.
 */
type IPRestrictionMatcherAddr = {
  addr: string
  type: AddressType
  isIPv4: boolean
  binaryAddr?: bigint
}
type IPRestrictionMatcher = (addr: IPRestrictionMatcherAddr) => boolean

/**
 * Rule data collections accumulated while building a matcher.
 */
type RuleSet = {
  functionRules: IPRestrictionRuleFunction[]
  staticRules: Set<string>
  staticIPv4Rules: Set<bigint>
  staticIPv6Rules: Set<bigint>
  cidrRules: [boolean, bigint, bigint][]
}

const IS_CIDR_NOTATION_REGEX = /\/[^/]*$/
const parseCidrPrefix = (rule: string, prefix: string, max: number): number => {
  if (!/^[0-9]{1,3}$/.test(prefix)) {
    throw new TypeError(`Invalid rule: ${rule}`)
  }
  const parsedPrefix = parseInt(prefix)
  if (parsedPrefix > max) {
    throw new TypeError(`Invalid rule: ${rule}`)
  }
  return parsedPrefix
}

/**
 * Create an empty set of rule data collections used while building a matcher.
 */
const createRuleSet = (): RuleSet => ({
  functionRules: [],
  staticRules: new Set(),
  staticIPv4Rules: new Set(),
  staticIPv6Rules: new Set(),
  cidrRules: [],
})

/**
 * Register a single static IP rule (IPv4 or IPv6) into the rule set.
 */
const registerStaticRule = (ruleSet: RuleSet, rule: string): void => {
  const type = distinctRemoteAddr(rule)
  if (type === undefined) {
    throw new TypeError(`Invalid rule: ${rule}`)
  }
  if (type === 'IPv4') {
    const ipv4binary = convertIPv4ToBinary(rule)
    ruleSet.staticRules.add(rule)
    ruleSet.staticRules.add(`::ffff:${rule}`)
    ruleSet.staticIPv4Rules.add(ipv4binary)
    ruleSet.staticIPv6Rules.add((0xffffn << 32n) | ipv4binary)
  } else {
    const ipv6binary = convertIPv6ToBinary(rule)
    const ipv6Addr = convertIPv6BinaryToString(ipv6binary)
    ruleSet.staticRules.add(ipv6Addr)
    ruleSet.staticIPv6Rules.add(ipv6binary)
    if (isIPv4MappedIPv6(ipv6binary)) {
      ruleSet.staticRules.add(ipv6Addr.substring(7)) // remove ::ffff: prefix
      ruleSet.staticIPv4Rules.add(convertIPv4MappedIPv6ToIPv4(ipv6binary))
    }
  }
}

/**
 * Register a CIDR-notation rule into the rule set.
 * A rule with a full-length prefix is treated as a static rule.
 */
const registerCidrRule = (ruleSet: RuleSet, rule: string): void => {
  const separatedRule = rule.split('/')

  const addrStr = separatedRule[0]
  const type = distinctRemoteAddr(addrStr)
  if (type === undefined) {
    throw new TypeError(`Invalid rule: ${rule}`)
  }

  let isIPv4 = type === 'IPv4'
  let prefix = parseCidrPrefix(rule, separatedRule[1], isIPv4 ? 32 : 128)

  if (isIPv4 ? prefix === 32 : prefix === 128) {
    // this rule is a static rule
    registerStaticRule(ruleSet, addrStr)
    return
  }

  let addr = (isIPv4 ? convertIPv4ToBinary : convertIPv6ToBinary)(addrStr)
  if (type === 'IPv6' && isIPv4MappedIPv6(addr) && prefix >= 96) {
    isIPv4 = true
    addr = convertIPv4MappedIPv6ToIPv4(addr)
    prefix -= 96
  }

  const mask = ((1n << BigInt(prefix)) - 1n) << BigInt((isIPv4 ? 32 : 128) - prefix)

  ruleSet.cidrRules.push([isIPv4, addr & mask, mask] as [boolean, bigint, bigint])
}

/**
 * Resolve the remote address in binary form (caching it on the remote object).
 */
const getBinaryAddr = (remote: IPRestrictionMatcherAddr): bigint =>
  (remote.binaryAddr ||= (
    remote.isIPv4 ? convertIPv4ToBinary : convertIPv6ToBinary
  )(remote.addr))

/**
 * Resolve the equivalent IPv4 binary address for the remote (if applicable).
 */
const getIPv4BinaryAddr = (
  remote: IPRestrictionMatcherAddr,
  binaryAddr: bigint
): bigint | undefined => {
  if (remote.isIPv4) {
    return binaryAddr
  }
  return isIPv4MappedIPv6(binaryAddr) ? convertIPv4MappedIPv6ToIPv4(binaryAddr) : undefined
}

/**
 * Test a remote address against the CIDR rule list.
 */
const matchCidrRules = (
  cidrRules: [boolean, bigint, bigint][],
  remote: IPRestrictionMatcherAddr
): boolean => {
  const binaryAddr = getBinaryAddr(remote)
  const ipv4BinaryAddr = getIPv4BinaryAddr(remote, binaryAddr)
  for (const [isIPv4Rule, addr, mask] of cidrRules) {
    if (isIPv4Rule) {
      if (ipv4BinaryAddr !== undefined && (ipv4BinaryAddr & mask) === addr) {
        return true
      }
      continue
    }
    if (!remote.isIPv4 && (binaryAddr & mask) === addr) {
      return true
    }
  }
  return false
}

/**
 * Build the function that actually tests a remote address against the rule set.
 */
const createMatcher = (ruleSet: RuleSet): IPRestrictionMatcher => {
  const { functionRules, staticRules, staticIPv4Rules, staticIPv6Rules, cidrRules } = ruleSet
  return (remote: IPRestrictionMatcherAddr): boolean => {
    if (staticRules.has(remote.addr)) {
      return true
    }
    const binaryAddr = getBinaryAddr(remote)
    const ipv4BinaryAddr = getIPv4BinaryAddr(remote, binaryAddr)
    if (remote.isIPv4 ? staticIPv4Rules.has(binaryAddr) : staticIPv6Rules.has(binaryAddr)) {
      return true
    }
    if (matchCidrRules(cidrRules, remote)) {
      return true
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
 * Build a matcher function from a list of IP restriction rules.
 */
const buildMatcher = (rules: IPRestrictionRule[]): IPRestrictionMatcher => {
  const ruleSet = createRuleSet()
  for (const rule of rules) {
    if (rule === '*') {
      return () => true
    } else if (typeof rule === 'function') {
      ruleSet.functionRules.push(rule)
    } else if (IS_CIDR_NOTATION_REGEX.test(rule)) {
      registerCidrRule(ruleSet, rule)
    } else {
      registerStaticRule(ruleSet, rule)
    }
  }
  return createMatcher(ruleSet)
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

    try {
      if (denyMatcher(remoteData)) {
        if (onError) {
          return onError({ addr, type }, c)
        }
        throw blockError(c)
      }
      if (allowMatcher(remoteData)) {
        return await next()
      }
    } catch (e) {
      if (
        e instanceof TypeError &&
        (e as InvalidIPAddressError).code === INVALID_IP_ADDRESS_ERROR_CODE
      ) {
        // If an invalid IP address is specified, treat it as if no IP address was specified
        throw blockError(c)
      }
      throw e
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
