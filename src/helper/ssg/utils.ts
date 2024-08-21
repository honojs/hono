import type { Hono } from '../../hono'
import { METHOD_NAME_ALL } from '../../router'
import type { Env, RouterRoute } from '../../types'
import { findTargetHandler, isMiddleware } from '../../utils/handler'

/**
 * Get dirname
 * @param path File Path
 * @returns Parent dir path
 */
export const dirname = (path: string): string => {
  const splittedPath = path.split(/[\/\\]/)
  return splittedPath.slice(0, -1).join('/') // Windows supports slash path
}

interface FilterStaticGenerateRouteData {
  path: string
}

export const filterStaticGenerateRoutes = <E extends Env>(
  hono: Hono<E>
): FilterStaticGenerateRouteData[] => {
  return hono.routes.reduce((acc, { method, handler, path }: RouterRoute) => {
    const targetHandler = findTargetHandler(handler)
    if (['GET', METHOD_NAME_ALL].includes(method) && !isMiddleware(targetHandler)) {
      acc.push({ path })
    }
    return acc
  }, [] as FilterStaticGenerateRouteData[])
}
