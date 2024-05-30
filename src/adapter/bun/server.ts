/**
 * Getting Bun Server Object for Bun adapters
 * @module
 */
import type { Context } from '../../context'

/**
 * Bun Server Object
 */
export interface BunServer {
  requestIP?: (req: Request) => {
    address: string
    family: string
    port: number
  }
  upgrade<T>(
    req: Request,
    options?: {
      data: T
    }
  ): boolean
}

/**
 * Get Bun Server Object from Context
 * @param c Context
 * @returns Bun Server
 */
export const getBunServer = (c: Context): BunServer | undefined =>
  ('server' in c.env ? c.env.server : c.env) as BunServer | undefined
