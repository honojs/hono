import type { Hono } from '../../hono.ts'
import type { Env, RouterRoute } from '../../types.ts'
import { findTargetHandler, isMiddleware } from '../../utils/handler.ts'

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

const handlerName = (handler: Function) => {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { process, Deno } = globalThis as any
  const isNoColor =
    typeof process !== 'undefined'
      ? // eslint-disable-next-line no-unsafe-optional-chaining
        'NO_COLOR' in process?.env
      : typeof Deno?.noColor === 'boolean'
      ? (Deno.noColor as boolean)
      : false
  const colorEnabled = opts?.colorize ?? !isNoColor
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

export const getRouterName = <E extends Env>(app: Hono<E>) => {
  app.router.match('GET', '/')
  return app.router.name
}
