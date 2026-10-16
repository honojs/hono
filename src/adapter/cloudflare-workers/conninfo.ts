import type { GetConnInfo } from '../../helper/conninfo'

/**
 * @deprecated `hono/cloudflare-workers` will be removed in v5. Install `@hono/cloudflare-workers` and import from there instead.
 */
export const getConnInfo: GetConnInfo = (c) => ({
  remote: {
    address: c.req.header('cf-connecting-ip'),
  },
})
