/**
 * Getting Ant Server Object for Ant adapters
 * @module
 */
import type { Context } from '../../context'

/**
 * Get Ant Server Object from Context.
 * Ant passes the server as the 2nd argument of `fetch`, so it is `c.env` by default.
 * `{ server }` is also accepted for apps that wrap `fetch` and forward their own env.
 * @template T - The type of Ant Server
 * @param c Context
 * @returns Ant Server
 */
export const getAntServer = <T>(c: Context): T | undefined =>
  (c.env && 'server' in c.env ? c.env.server : c.env) as T | undefined
