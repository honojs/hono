import type { Context } from '../../context'

export const basePath = (c: Context) => {
  return c.req.matchedRoutes[c.req.routeIndex].basePath
}
