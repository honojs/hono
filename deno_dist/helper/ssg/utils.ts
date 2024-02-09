import type { Hono } from '../../hono.ts'
import { METHOD_NAME_ALL } from '../../router.ts'
import type { Env, RouterRoute } from '../../types.ts'
import { findTargetHandler, isMiddleware } from '../../utils/handler.ts'

/**
 * Get dirname
 * @param path File Path
 * @returns Parent dir path
 */
export const dirname = (path: string) => {
  const splitedPath = path.split(/[\/\\]/)
  return splitedPath.slice(0, -1).join('/') // Windows supports slash path
}

const normalizePath = (path: string) => {
  return path.replace(/(\\)/g, '/').replace(/\/$/g, '')
}

const handleDotDot = (resultPaths: string[]) => {
  if (resultPaths.length === 0) {
    resultPaths.push('..')
  } else {
    resultPaths.pop()
  }
}

const handleNonDot = (path: string, resultPaths: string[]) => {
  path = path.replace(/^\.(?!.)/, '')
  if (path !== '') {
    resultPaths.push(path)
  }
}

const handleSegments = (paths: string[], resultPaths: string[]) => {
  for (const path of paths) {
    // Handle `..` or `../`
    if (path === '..') {
      handleDotDot(resultPaths)
    } else {
      // Handle `.` or `./`
      handleNonDot(path, resultPaths)
    }
  }
}

export const joinPaths = (...paths: string[]) => {
  paths = paths.map(normalizePath)
  const resultPaths: string[] = []
  handleSegments(paths.join('/').split('/'), resultPaths)
  return (paths[0][0] === '/' ? '/' : '') + resultPaths.join('/')
}

interface FilterStaticGenerateRouteData {
  path: string
}

export const filterStaticGenerateRoutes = <E extends Env>(
  hono: Hono<E>
): FilterStaticGenerateRouteData[] => {
  return hono.routes
    .filter(({ method, handler }: RouterRoute) => {
      const targetHandler = findTargetHandler(handler)
      return ['GET', METHOD_NAME_ALL].includes(method) && !isMiddleware(targetHandler)
    })
    .map(({ path }: RouterRoute) => {
      return {
        path,
      }
    })
}
