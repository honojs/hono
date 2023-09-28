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
  const headersToSet = Object.entries(HEADERS_MAP)
    .filter(([key]) => options[key as keyof SecureHeadersOptions])
    .map(([key, defaultValue]) => {
      const overrideValue = options[key as keyof SecureHeadersOptions]
      if (typeof overrideValue === 'string') return [defaultValue[0], overrideValue]
      return defaultValue
    })

  if (options.contentSecurityPolicy) {
    const cspDirectives = Object.entries(options.contentSecurityPolicy)
      .map(([directive, value]) => {
        // convert camelCase to kebab-case directives (e.g. `defaultSrc` -> `default-src`)
        directive = directive.replace(
          /[A-Z]+(?![a-z])|[A-Z]/g,
          (match, offset) => (offset ? '-' : '') + match.toLowerCase()
        )
        return `${directive} ${Array.isArray(value) ? value.join(' ') : value}`
      })
      .join('; ')
    headersToSet.push(['Content-Security-Policy', cspDirectives])
  }

  if (options.reportingEndpoints) {
    const reportingEndpoints = options.reportingEndpoints
      .map((endpoint) => `${endpoint.name}="${endpoint.url}"`)
      .join(', ')
    headersToSet.push(['Reporting-Endpoints', reportingEndpoints])
  }

  if (options.reportTo) {
    const reportToOptions = options.reportTo.map((option) => JSON.stringify(option)).join(', ')
    headersToSet.push(['Report-To', reportToOptions])
  }

  return async (ctx, next) => {
    await next()
    headersToSet.forEach(([header, value]) => {
      ctx.res.headers.set(header, value)
    })

    ctx.res.headers.delete('X-Powered-By')
  }
}
