import type { Context } from '../../context'
import type { GetConnInfo } from '../../helper/conninfo'

/**
 * Netlify context type
 * @see https://docs.netlify.com/functions/api/
 */
type NetlifyContext = {
  ip?: string
  geo?: {
    city?: string
    country?: {
      code?: string
      name?: string
    }
    subdivision?: {
      code?: string
      name?: string
    }
    latitude?: number
    longitude?: number
    timezone?: string
    postalCode?: string
  }
  requestId?: string
}

type Env = {
  Bindings: {
    context: NetlifyContext
  }
}

/**
 * Get connection information from Netlify
 * @param c - Context
 * @returns Connection information including remote address
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { handle, getConnInfo } from 'hono/netlify'
 *
 * const app = new Hono()
 *
 * app.get('/', (c) => {
 *   const info = getConnInfo(c)
 *   return c.text(`Your IP: ${info.remote.address}`)
 * })
 *
 * export default handle(app)
 * ```
 */
export const getConnInfo: GetConnInfo = (c: Context<Env>) => ({
  remote: {
    address: c.env.context?.ip,
  },
})

/**
 * Get geolocation data from Netlify context
 * @param c - Context
 * @returns Geolocation data or undefined
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { handle, getGeo } from 'hono/netlify'
 *
 * const app = new Hono()
 *
 * app.get('/', (c) => {
 *   const geo = getGeo(c)
 *   return c.json({
 *     country: geo?.country?.code,
 *     city: geo?.city,
 *   })
 * })
 *
 * export default handle(app)
 * ```
 */
export const getGeo = (c: Context<Env>) => c.env.context?.geo
