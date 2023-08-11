import type { MiddlewareHandler } from '../../types'

interface SecureHeaderOptions {
  crossOriginResourcePolicy?: boolean
  crossOriginOpenerPolicy?: boolean
  referrerPolicy?: boolean
  strictTransportSecurity?: boolean
  xContentTypeOptions?: boolean
  xDnsPrefetchControl?: boolean
  xDownloadOptions?: boolean
  xFrameOptions?: boolean
  xPermittedCrossDomainPolicies?: boolean
  xXssProtection?: boolean
}

type HeaderMap = {
  [key in keyof SecureHeaderOptions]: [string, string]
}

const HEADER_MAP: HeaderMap = {
  crossOriginResourcePolicy: ['Cross-Origin-Resource-Policy', 'same-origin'],
  crossOriginOpenerPolicy: ['Cross-Origin-Opener-Policy', 'same-origin'],
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
  referrerPolicy: true,
  strictTransportSecurity: true,
  xContentTypeOptions: true,
  xDnsPrefetchControl: true,
  xDownloadOptions: true,
  xFrameOptions: true,
  xPermittedCrossDomainPolicies: true,
  xXssProtection: true,
}

export const secureHeader = (customOptions?: Partial<SecureHeaderOptions>): MiddlewareHandler => {
  const options = { ...DEFAULT_OPTIONS, ...customOptions }
  const headersToSet = Object.entries(HEADER_MAP)
    .filter(([key]) => options[key as keyof SecureHeaderOptions])
    .map(([, value]) => value)

  return async (ctx, next) => {
    headersToSet.forEach(([header, value]) => {
      ctx.res.headers.set(header, value)
    })

    ctx.res.headers.delete('X-Powered-By')
    await next()
  }
}
