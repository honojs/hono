/**
 * Getting Bun Server Object for Bun adapters
 * @module
 */
import type { Context } from '../../context'

/**
 * Get Bun Server Object from Context
 * @param c Context
 * @returns Bun Server
 */
export const getBunServer = <ServerT>(c: Context): ServerT | undefined =>
  ('server' in c.env ? c.env.server : c.env) as ServerT | undefined
