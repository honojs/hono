import type { MiddlewareHandler } from '../../types'

interface ContentSecurityPolicy {
  directives: {
    [key: string]: string[]
  }
}

interface SecureHeaderOptions {
  xContentTypeOptions?: boolean
  xDnsPrefetchControl?: boolean
  xFrameOptions?: boolean
  strictTransportSecurity?: boolean
  xDownloadOptions?: boolean
  xXssProtection?: boolean
}

export const secureHeader = (options?: SecureHeaderOptions): MiddlewareHandler => {
  return async (ctx, next) => {
    if (options?.xContentTypeOptions !== false) {
      ctx.res.headers.set('X-Content-Type-Options', 'nosniff')
    }

    if (options?.xDnsPrefetchControl !== false) {
      ctx.res.headers.set('X-DNS-Prefetch-Control', 'off')
    }
    
    if (options?.xFrameOptions !== false) {
      ctx.res.headers.set('X-Frame-Options', 'DENY')
    }
    
    if (options?.strictTransportSecurity !== false) {
      ctx.res.headers.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
    }
    
    if (options?.xDownloadOptions !== false) {
      ctx.res.headers.set('X-Download-Options', 'noopen')
    }

    if (options?.xXssProtection !== false) {
      ctx.res.headers.set('X-XSS-Protection', '0')
    }

    ctx.res.headers.delete('X-Powered-By')

    await next()
  }
}