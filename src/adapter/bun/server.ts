/**
 * Getting Bun Server Object for Bun adapters
 * @module
 */
import type { Context } from '../../context'

/**
 * Get Bun Server Object from Context
 * @template T - The type of Bun Server
 * @param c Context
 * @returns Bun Server
 * @deprecated `hono/bun` will be removed in v5. Install `@hono/bun` and import from there instead.
 */
export const getBunServer = <T>(c: Context): T | undefined =>
  ('server' in c.env ? c.env.server : c.env) as T | undefined
