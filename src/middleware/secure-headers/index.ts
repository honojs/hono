import type { MiddlewareHandler } from '../../types'

interface SecureHeadersOptions {
  crossOriginResourcePolicy?: boolean
  crossOriginOpenerPolicy?: boolean
  originAgentCluster: boolean
  referrerPolicy?: boolean
  strictTransportSecurity?: boolean
  xContentTypeOptions?: boolean
  xDnsPrefetchControl?: boolean
  xDownloadOptions?: boolean
  xFrameOptions?: boolean
  xPermittedCrossDomainPolicies?: boolean
  xXssProtection?: boolean
}

type HeadersMap = {
  [key in keyof SecureHeadersOptions]: [string, string]
}

const HEADERS_MAP: HeadersMap = {
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

const DEFAULT_OPTIONS = {
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
    .map(([, value]) => value)

  return async (ctx, next) => {
    headersToSet.forEach(([header, value]) => {
      ctx.res.headers.set(header, value)
    })

    ctx.res.headers.delete('X-Powered-By')
    await next()
  }
}
