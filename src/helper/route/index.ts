import type { Context } from '../../context'
import { GET_MATCH_RESULT } from '../../request/constants'

export const matchedRoutes = (c: Context) => c.req[GET_MATCH_RESULT][0].map(([[, route]]) => route)
export const routePath = (c: Context) => matchedRoutes(c)[c.req.routeIndex].path
export const basePath = (c: Context) => matchedRoutes(c)[c.req.routeIndex].basePath
