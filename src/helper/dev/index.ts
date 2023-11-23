import type { Hono } from '../../hono'
import type { RouterRoute } from '../../hono-base'

interface ShowRoutesOptions {
  includeMiddleware?: boolean
  showList?: boolean
}

interface RouteData {
  path: string
  method: string
  name: string
  isMiddleware: boolean
}

const isMiddleware = (handler: Function) => handler.length > 1
const handlerName = (handler: Function) => {
  return handler.name || (isMiddleware(handler) ? '[middleware]' : '[handler]')
}

export const inspectRoutes = (hono: Hono): RouteData[] => {
  return hono.routes.map(({ path, method, handler }: RouterRoute) => ({
    path,
    method,
    name: handlerName(handler),
    isMiddleware: isMiddleware(handler),
  }))
}

export const showRoutes = (hono: Hono, opts?: ShowRoutesOptions) => {
  const routeData: Record<string, RouteData[]> = {}
  let maxMethodLength = 0
  let maxPathLength = 0

  inspectRoutes(hono)
    .filter(({ isMiddleware }) => opts?.includeMiddleware || !isMiddleware)
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

      console.log(`\x1b[32m${method}\x1b[0m ${' '.repeat(maxMethodLength - method.length)} ${path}`)

      if (!opts?.showList) {
        return
      }

      routes.forEach(({ name }) => {
        console.log(`${' '.repeat(maxMethodLength + 3)} ${name}`)
      })
    })
}
