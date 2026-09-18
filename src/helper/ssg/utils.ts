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
  const separatedPath = path.split(/[\/\\]/)
  return separatedPath.slice(0, -1).join('/') // Windows supports slash path
}

const normalizePath = (path: string): string => {
  return path.replace(/(\\)/g, '/').replace(/\/$/g, '')
}

const getUncRoot = (path: string): string | undefined => {
  const uncRoot = path.replace(/\\/g, '/').match(/^\/\/([^/]+)\/([^/]+)/)
  if (uncRoot) {
    return `${uncRoot[1].toLowerCase()}/${uncRoot[2].toLowerCase()}`
  }
}

const handleParent = (resultPaths: string[]): void => {
  if (resultPaths.length === 0 || resultPaths[resultPaths.length - 1] === '..') {
    resultPaths.push('..')
  } else {
    resultPaths.pop()
  }
}

const handleNonDot = (path: string, resultPaths: string[]): void => {
  path = path.replace(/^\.(?!.)/, '')
  if (path !== '') {
    resultPaths.push(path)
  }
}

const handleSegments = (paths: string[], resultPaths: string[]): void => {
  for (const path of paths) {
    // Handle `..`
    if (path === '..') {
      handleParent(resultPaths)
    } else {
      // Handle `.` or `abc`
      handleNonDot(path, resultPaths)
    }
  }
}

export const joinPaths = (...paths: string[]): string => {
  const hasUncPrefix = getUncRoot(paths[0]) !== undefined
  paths = paths.map(normalizePath)
  const resultPaths: string[] = []
  handleSegments(paths.join('/').split('/'), resultPaths)
  return (hasUncPrefix ? '//' : paths[0][0] === '/' ? '/' : '') + resultPaths.join('/')
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

export const isDynamicRoute = (path: string): boolean => {
  return path.split('/').some((segment) => segment.startsWith(':') || segment.includes('*'))
}

const toSegments = (path: string): string[] => (path === '' ? [] : path.split('/'))

const getPathRoot = (path: string): string => {
  const normalizedPath = path.replace(/\\/g, '/')
  const uncRoot = getUncRoot(normalizedPath)
  if (uncRoot) {
    return `unc:${uncRoot}`
  }

  const driveRoot = normalizedPath.match(/^([A-Za-z]):/)
  if (driveRoot) {
    const kind = normalizedPath[2] === '/' ? 'drive-absolute' : 'drive-relative'
    return `${kind}:${driveRoot[1].toLowerCase()}`
  }

  return normalizedPath.startsWith('/') ? 'absolute' : 'relative'
}

export const ensureWithinOutDir = (outDir: string, filePath: string): void => {
  const outDirSegments = toSegments(joinPaths(outDir))
  const filePathSegments = toSegments(joinPaths(filePath))

  const hasMismatchedPathRoot = getPathRoot(outDir) !== getPathRoot(filePath)

  // `joinPaths` collects every remaining `..` at the head, so a `..` right after
  // the outDir segments means the file path climbs above outDir
  const climbsAboveOutDir = filePathSegments[outDirSegments.length] === '..'

  if (
    hasMismatchedPathRoot ||
    filePathSegments.length <= outDirSegments.length ||
    !outDirSegments.every((segment, i) => segment === filePathSegments[i]) ||
    climbsAboveOutDir
  ) {
    throw new Error(`Path traversal detected: "${filePath}" is outside the output directory`)
  }
}
