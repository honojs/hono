import { Buffer } from "node:buffer";
import type { Context } from '../../context.ts'
import type { MiddlewareHandler } from '../../types.ts'

declare module '../../context.ts' {
  interface ContextVariableMap {
    secureHeadersNonce?: string
  }
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

type overridableHeader = boolean | string

interface SecureHeadersOptions {
  contentSecurityPolicy?: ContentSecurityPolicyOptions
  crossOriginEmbedderPolicy?: overridableHeader
  crossOriginResourcePolicy?: overridableHeader
  crossOriginOpenerPolicy?: overridableHeader
  originAgentCluster: overridableHeader
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
}

type SecureHeadersCallback = (
  ctx: Context,
  headersToSet: [string, string | string[]][]
) => [string, string][]

const generateNonce = () => {
  const buffer = new Uint8Array(16)
  crypto.getRandomValues(buffer)
  return Buffer.from(buffer).toString('base64')
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

export const secureHeaders = (customOptions?: Partial<SecureHeadersOptions>): MiddlewareHandler => {
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
    ctx.res.headers.delete('X-Powered-By')
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
