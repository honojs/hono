import type { MiddlewareHandler } from '../../types'

interface SecureHeaderOptions {
  xContentTypeOptions?: boolean;
  xDnsPrefetchControl?: boolean;
  xFrameOptions?: boolean;
  strictTransportSecurity?: boolean;
  xDownloadOptions?: boolean;
  xXssProtection?: boolean;
}

const HEADER_MAP = {
  referrerPolicy: ['Referrer-Policy', 'no-referrer'],
  strictTransportSecurity: ['Strict-Transport-Security', 'max-age=15552000; includeSubDomains'],
  xContentTypeOptions: ['X-Content-Type-Options', 'nosniff'],
  xDnsPrefetchControl: ['X-DNS-Prefetch-Control', 'off'],
  xDownloadOptions: ['X-Download-Options', 'noopen'],
  xFrameOptions: ['X-Frame-Options', 'SAMEORIGIN'],
  xPermittedCrossDomainPolicies: ['X-Permitted-Cross-Domain-Policies', 'none'],
  xXssProtection: ['X-XSS-Protection', '0']
}

const DEFAULT_OPTIONS = {
  xContentTypeOptions: true,
  xDnsPrefetchControl: true,
  xFrameOptions: true,
  strictTransportSecurity: true,
  xDownloadOptions: true,
  xXssProtection: true
}

export const secureHeader = (customOptions?: Partial<SecureHeaderOptions>): MiddlewareHandler => {
  const options = { ...DEFAULT_OPTIONS, ...customOptions }
  const headersToSet = Object.entries(HEADER_MAP)
  .filter(([key]) => options[key as keyof SecureHeaderOptions])
  .map(([key, value]) => value)

  return async (ctx, next) => {
    headersToSet.forEach(([header, value]) => {
      ctx.res.headers.set(header, value)
    })

    ctx.res.headers.delete('X-Powered-By')
    await next()
  }
}
