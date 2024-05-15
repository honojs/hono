// This file is for Deno to import middleware from `hono/middleware.ts`.

/**
 * Basic authentication middleware.
 */
export * from './middleware/basic-auth'

/**
 * Bearer authentication middleware.
 */
export * from './middleware/bearer-auth'

/**
 * Body size limit middleware.
 */
export * from './middleware/body-limit'

/**
 * Cache middleware.
 */
export * from './middleware/cache'

/**
 * Compression middleware.
 */
export * from './middleware/compress'

/**
 * CORS middleware.
 */
export * from './middleware/cors'

/**
 * CSRF protection middleware.
 */
export * from './middleware/csrf'

/**
 * ETag middleware.
 */
export * from './middleware/etag'

/**
 * JSX middleware.
 */
export * from './jsx'

/**
 * JSX renderer middleware.
 */
export * from './middleware/jsx-renderer'

/**
 * JWT authentication middleware.
 */
export { jwt } from './middleware/jwt'

/**
 * Logger middleware.
 */
export * from './middleware/logger'

/**
 * Method override middleware.
 */
export * from './middleware/method-override'

/**
 * Powered-by header middleware.
 */
export * from './middleware/powered-by'

/**
 * Timing middleware.
 */
export * from './middleware/timing'

/**
 * Pretty JSON middleware.
 */
export * from './middleware/pretty-json'

/**
 * Secure headers middleware.
 */
export * from './middleware/secure-headers'

/**
 * Trailing slash middleware.
 */
export * from './middleware/trailing-slash'

/**
 * Static file serving middleware for Deno.
 */
export * from './adapter/deno/serve-static'
