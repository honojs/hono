/**
 * @module
 * Secure Headers Middleware for Hono.
 */

import type { Context } from '../../context'
import type { MiddlewareHandler } from '../../types'
import { encodeBase64 } from '../../utils/encode'
import type { PermissionsPolicyDirective } from './permissions-policy'

export type SecureHeadersVariables = {
  secureHeadersNonce?: string
}

export type ContentSecurityPolicyOptionHandler = (ctx: Context, directive: string) => string
type ContentSecurityPolicyOptionValue = (string | ContentSecurityPolicyOptionHandler)[]

interface ContentSecurityPolicyOptions {
  defaultSrc?: ContentSecurityPolicyOptionValue
  baseUri?: ContentSecurityPolicyOptionValue
  childSrc?: ContentSecurityPolicyOptionValue
  connectSrc?: ContentSecurityPolicyOptionValue
  fontSrc?: ContentSecurityPolicyOptionValue
  formAction?: ContentSecurityPolicyOptionValue
  frameAncestors?: ContentSecurityPolicyOptionValue
  frameSrc?: ContentSecurityPolicyOptionValue
  imgSrc?: ContentSecurityPolicyOptionValue
  manifestSrc?: ContentSecurityPolicyOptionValue
  mediaSrc?: ContentSecurityPolicyOptionValue
  objectSrc?: ContentSecurityPolicyOptionValue
  reportTo?: string
  sandbox?: ContentSecurityPolicyOptionValue
  scriptSrc?: ContentSecurityPolicyOptionValue
  scriptSrcAttr?: ContentSecurityPolicyOptionValue
  scriptSrcElem?: ContentSecurityPolicyOptionValue
  styleSrc?: ContentSecurityPolicyOptionValue
  styleSrcAttr?: ContentSecurityPolicyOptionValue
  styleSrcElem?: ContentSecurityPolicyOptionValue
  upgradeInsecureRequests?: ContentSecurityPolicyOptionValue
  workerSrc?: ContentSecurityPolicyOptionValue
}

interface ReportToOptions {
  group: string
  max_age: number
  endpoints: ReportToEndpoint[]
}

interface ReportToEndpoint {
  url: string
}

interface ReportingEndpointOptions {
  name: string
  url: string
}

type PermissionsPolicyValue = '*' | 'self' | 'src' | 'none' | string

type PermissionsPolicyOptions = Partial<
  Record<PermissionsPolicyDirective, PermissionsPolicyValue[] | boolean>
>

type overridableHeader = boolean | string

interface SecureHeadersOptions {
  contentSecurityPolicy?: ContentSecurityPolicyOptions
  crossOriginEmbedderPolicy?: overridableHeader
  crossOriginResourcePolicy?: overridableHeader
  crossOriginOpenerPolicy?: overridableHeader
  originAgentCluster?: overridableHeader
  referrerPolicy?: overridableHeader
  reportingEndpoints?: ReportingEndpointOptions[]
  reportTo?: ReportToOptions[]
  strictTransportSecurity?: overridableHeader
  xContentTypeOptions?: overridableHeader
  xDnsPrefetchControl?: overridableHeader
  xDownloadOptions?: overridableHeader
  xFrameOptions?: overridableHeader
  xPermittedCrossDomainPolicies?: overridableHeader
  xXssProtection?: overridableHeader
  removePoweredBy?: boolean
  permissionsPolicy?: PermissionsPolicyOptions
}

type HeadersMap = {
  [key in keyof SecureHeadersOptions]: [string, string]
}

const HEADERS_MAP: HeadersMap = {
  crossOriginEmbedderPolicy: ['Cross-Origin-Embedder-Policy', 'require-corp'],
  crossOriginResourcePolicy: ['Cross-Origin-Resource-Policy', 'same-origin'],
  crossOriginOpenerPolicy: ['Cross-Origin-Opener-Policy', 'same-origin'],
  originAgentCluster: ['Origin-Agent-Cluster', '?1'],
  referrerPolicy: ['Referrer-Policy', 'no-referrer'],
  strictTransportSecurity: ['Strict-Transport-Security', 'max-age=15552000; includeSubDomains'],
  xContentTypeOptions: ['X-Content-Type-Options', 'nosniff'],
  xDnsPrefetchControl: ['X-DNS-Prefetch-Control', 'off'],
  xDownloadOptions: ['X-Download-Options', 'noopen'],
  xFrameOptions: ['X-Frame-Options', 'SAMEORIGIN'],
  xPermittedCrossDomainPolicies: ['X-Permitted-Cross-Domain-Policies', 'none'],
  xXssProtection: ['X-XSS-Protection', '0'],
}

const DEFAULT_OPTIONS: SecureHeadersOptions = {
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: true,
  crossOriginOpenerPolicy: true,
  originAgentCluster: true,
  referrerPolicy: true,
  strictTransportSecurity: true,
  xContentTypeOptions: true,
  xDnsPrefetchControl: true,
  xDownloadOptions: true,
  xFrameOptions: true,
  xPermittedCrossDomainPolicies: true,
  xXssProtection: true,
  removePoweredBy: true,
  permissionsPolicy: {},
}

type SecureHeadersCallback = (
  ctx: Context,
  headersToSet: [string, string | string[]][]
) => [string, string][]

const generateNonce = () => {
  const buffer = new Uint8Array(16)
  crypto.getRandomValues(buffer)
  return encodeBase64(buffer)
}

export const NONCE: ContentSecurityPolicyOptionHandler = (ctx) => {
  const nonce =
    ctx.get('secureHeadersNonce') ||
    (() => {
      const newNonce = generateNonce()
      ctx.set('secureHeadersNonce', newNonce)
      return newNonce
    })()
  return `'nonce-${nonce}'`
}

/**
 * Secure Headers Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/secure-headers}
 *
 * @param {Partial<SecureHeadersOptions>} [customOptions] - The options for the secure headers middleware.
 * @param {ContentSecurityPolicyOptions} [customOptions.contentSecurityPolicy] - Settings for the Content-Security-Policy header.
 * @param {overridableHeader} [customOptions.crossOriginEmbedderPolicy=false] - Settings for the Cross-Origin-Embedder-Policy header.
 * @param {overridableHeader} [customOptions.crossOriginResourcePolicy=true] - Settings for the Cross-Origin-Resource-Policy header.
 * @param {overridableHeader} [customOptions.crossOriginOpenerPolicy=true] - Settings for the Cross-Origin-Opener-Policy header.
 * @param {overridableHeader} [customOptions.originAgentCluster=true] - Settings for the Origin-Agent-Cluster header.
 * @param {overridableHeader} [customOptions.referrerPolicy=true] - Settings for the Referrer-Policy header.
 * @param {ReportingEndpointOptions[]} [customOptions.reportingEndpoints] - Settings for the Reporting-Endpoints header.
 * @param {ReportToOptions[]} [customOptions.reportTo] - Settings for the Report-To header.
 * @param {overridableHeader} [customOptions.strictTransportSecurity=true] - Settings for the Strict-Transport-Security header.
 * @param {overridableHeader} [customOptions.xContentTypeOptions=true] - Settings for the X-Content-Type-Options header.
 * @param {overridableHeader} [customOptions.xDnsPrefetchControl=true] - Settings for the X-DNS-Prefetch-Control header.
 * @param {overridableHeader} [customOptions.xDownloadOptions=true] - Settings for the X-Download-Options header.
 * @param {overridableHeader} [customOptions.xFrameOptions=true] - Settings for the X-Frame-Options header.
 * @param {overridableHeader} [customOptions.xPermittedCrossDomainPolicies=true] - Settings for the X-Permitted-Cross-Domain-Policies header.
 * @param {overridableHeader} [customOptions.xXssProtection=true] - Settings for the X-XSS-Protection header.
 * @param {boolean} [customOptions.removePoweredBy=true] - Settings for remove X-Powered-By header.
 * @param {PermissionsPolicyOptions} [customOptions.permissionsPolicy] - Settings for the Permissions-Policy header.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 * app.use(secureHeaders())
 * ```
 */
export const secureHeaders = (customOptions?: SecureHeadersOptions): MiddlewareHandler => {
  const options = { ...DEFAULT_OPTIONS, ...customOptions }
  const headersToSet = getFilteredHeaders(options)
  const callbacks: SecureHeadersCallback[] = []

  if (options.contentSecurityPolicy) {
    const [callback, value] = getCSPDirectives(options.contentSecurityPolicy)
    if (callback) {
      callbacks.push(callback)
    }
    headersToSet.push(['Content-Security-Policy', value as string])
  }

  if (options.permissionsPolicy && Object.keys(options.permissionsPolicy).length > 0) {
    headersToSet.push([
      'Permissions-Policy',
      getPermissionsPolicyDirectives(options.permissionsPolicy),
    ])
  }

  if (options.reportingEndpoints) {
    headersToSet.push(['Reporting-Endpoints', getReportingEndpoints(options.reportingEndpoints)])
  }

  if (options.reportTo) {
    headersToSet.push(['Report-To', getReportToOptions(options.reportTo)])
  }

  return async function secureHeaders(ctx, next) {
    // should evaluate callbacks before next()
    // some callback calls ctx.set() for embedding nonce to the page
    const headersToSetForReq =
      callbacks.length === 0
        ? headersToSet
        : callbacks.reduce((acc, cb) => cb(ctx, acc), headersToSet)
    await next()
    setHeaders(ctx, headersToSetForReq)

    if (options?.removePoweredBy) {
      ctx.res.headers.delete('X-Powered-By')
    }
  }
}

function getFilteredHeaders(options: SecureHeadersOptions): [string, string][] {
  return Object.entries(HEADERS_MAP)
    .filter(([key]) => options[key as keyof SecureHeadersOptions])
    .map(([key, defaultValue]) => {
      const overrideValue = options[key as keyof SecureHeadersOptions]
      return typeof overrideValue === 'string' ? [defaultValue[0], overrideValue] : defaultValue
    })
}

function getCSPDirectives(
  contentSecurityPolicy: ContentSecurityPolicyOptions
): [SecureHeadersCallback | undefined, string | string[]] {
  const callbacks: ((ctx: Context, values: string[]) => void)[] = []
  const resultValues: string[] = []

  for (const [directive, value] of Object.entries(contentSecurityPolicy)) {
    const valueArray = Array.isArray(value) ? value : [value]

    valueArray.forEach((value, i) => {
      if (typeof value === 'function') {
        const index = i * 2 + 2 + resultValues.length
        callbacks.push((ctx, values) => {
          values[index] = value(ctx, directive)
        })
      }
    })

    resultValues.push(
      directive.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (match, offset) =>
        offset ? '-' + match.toLowerCase() : match.toLowerCase()
      ),
      ...valueArray.flatMap((value) => [' ', value]),
      '; '
    )
  }
  resultValues.pop()

  return callbacks.length === 0
    ? [undefined, resultValues.join('')]
    : [
        (ctx, headersToSet) =>
          headersToSet.map((values) => {
            if (values[0] === 'Content-Security-Policy') {
              const clone = values[1].slice() as unknown as string[]
              callbacks.forEach((cb) => {
                cb(ctx, clone)
              })
              return [values[0], clone.join('')]
            } else {
              return values as [string, string]
            }
          }),
        resultValues,
      ]
}

function getPermissionsPolicyDirectives(policy: PermissionsPolicyOptions): string {
  return Object.entries(policy)
    .map(([directive, value]) => {
      const kebabDirective = camelToKebab(directive)

      if (typeof value === 'boolean') {
        return `${kebabDirective}=${value ? '()' : 'none'}`
      }

      if (Array.isArray(value)) {
        const allowlist = value.length === 0 ? '()' : `(${value.join(' ')})`
        return `${kebabDirective}=${allowlist}`
      }

      return ''
    })
    .filter(Boolean)
    .join(', ')
}

function camelToKebab(str: string): string {
  return str.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase()
}

function getReportingEndpoints(
  reportingEndpoints: SecureHeadersOptions['reportingEndpoints'] = []
): string {
  return reportingEndpoints.map((endpoint) => `${endpoint.name}="${endpoint.url}"`).join(', ')
}

function getReportToOptions(reportTo: SecureHeadersOptions['reportTo'] = []): string {
  return reportTo.map((option) => JSON.stringify(option)).join(', ')
}

function setHeaders(ctx: Context, headersToSet: [string, string][]) {
  headersToSet.forEach(([header, value]) => {
    ctx.res.headers.set(header, value)
  })
}
