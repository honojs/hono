import type { Context } from '../../context.ts'
import type { MiddlewareHandler } from '../../types.ts'

interface ContentSecurityPolicyOptions {
  defaultSrc?: string[]
  baseUri?: string[]
  childSrc?: string[]
  connectSrc?: string[]
  fontSrc?: string[]
  formAction?: string[]
  frameAncestors?: string[]
  frameSrc?: string[]
  imgSrc?: string[]
  manifestSrc?: string[]
  mediaSrc?: string[]
  objectSrc?: string[]
  reportTo?: string
  sandbox?: string[]
  scriptSrc?: string[]
  scriptSrcAttr?: string[]
  scriptSrcElem?: string[]
  styleSrc?: string[]
  styleSrcAttr?: string[]
  styleSrcElem?: string[]
  upgradeInsecureRequests?: string[]
  workerSrc?: string[]
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

export const secureHeaders = (customOptions?: Partial<SecureHeadersOptions>): MiddlewareHandler => {
  const options = { ...DEFAULT_OPTIONS, ...customOptions }
  const headersToSet = getFilteredHeaders(options)

  if (options.contentSecurityPolicy) {
    headersToSet.push(['Content-Security-Policy', getCSPDirectives(options.contentSecurityPolicy)])
  }

  if (options.reportingEndpoints) {
    headersToSet.push(['Reporting-Endpoints', getReportingEndpoints(options.reportingEndpoints)])
  }

  if (options.reportTo) {
    headersToSet.push(['Report-To', getReportToOptions(options.reportTo)])
  }

  return async function secureHeaders(ctx, next) {
    await next()
    setHeaders(ctx, headersToSet)
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
  contentSecurityPolicy: SecureHeadersOptions['contentSecurityPolicy']
): string {
  return Object.entries(contentSecurityPolicy || [])
    .map(([directive, value]) => {
      const kebabCaseDirective = directive.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (match, offset) =>
        offset ? '-' + match.toLowerCase() : match.toLowerCase()
      )
      return `${kebabCaseDirective} ${Array.isArray(value) ? value.join(' ') : value}`
    })
    .join('; ')
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
