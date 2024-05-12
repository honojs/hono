import type { Hono } from '../../hono'
import type { Env, RouterRoute } from '../../types'
import { getColorEnabled } from '../../utils/color'
import { findTargetHandler, isMiddleware } from '../../utils/handler'

interface ShowRoutesOptions {
  verbose?: boolean
  colorize?: boolean
}

interface RouteData {
  path: string
  method: string
  name: string
  isMiddleware: boolean
}

const handlerName = (handler: Function): string => {
  return handler.name || (isMiddleware(handler) ? '[middleware]' : '[handler]')
}

export const inspectRoutes = <E extends Env>(hono: Hono<E>): RouteData[] => {
  return hono.routes.map(({ path, method, handler }: RouterRoute) => {
    const targetHandler = findTargetHandler(handler)
    return {
      path,
      method,
      name: handlerName(targetHandler),
      isMiddleware: isMiddleware(targetHandler),
    }
  })
}

export const showRoutes = <E extends Env>(hono: Hono<E>, opts?: ShowRoutesOptions) => {
  const colorEnabled = opts?.colorize ?? getColorEnabled()
  const routeData: Record<string, RouteData[]> = {}
  let maxMethodLength = 0
  let maxPathLength = 0

  inspectRoutes(hono)
    .filter(({ isMiddleware }) => opts?.verbose || !isMiddleware)
    .map((route) => {
      const key = `${route.method}-${route.path}`
      ;(routeData[key] ||= []).push(route)
      if (routeData[key].length > 1) {
        return
      }
      maxMethodLength = Math.max(maxMethodLength, route.method.length)
      maxPathLength = Math.max(maxPathLength, route.path.length)
      return { method: route.method, path: route.path, routes: routeData[key] }
    })
    .forEach((data) => {
      if (!data) {
        return
      }
      const { method, path, routes } = data

      const methodStr = colorEnabled ? `\x1b[32m${method}\x1b[0m` : method
      console.log(`${methodStr} ${' '.repeat(maxMethodLength - method.length)} ${path}`)

      if (!opts?.verbose) {
        return
      }

      routes.forEach(({ name }) => {
        console.log(`${' '.repeat(maxMethodLength + 3)} ${name}`)
      })
    })
}

export const getRouterName = <E extends Env>(app: Hono<E>): string => {
  app.router.match('GET', '/')
  return app.router.name
}
