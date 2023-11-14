import type { Hono } from './hono'

interface showRoutesOptions {
  includeMiddleware?: boolean
}

export const showRoutes = (hono: Hono, opts?: showRoutesOptions) => {
  const length = 8
  const routeCount: Record<string, number> = {}
  hono.routes
    .filter(({ handler }) => opts?.includeMiddleware || handler.length === 1)
    .map((route) => {
      const key = `${route.method} ${route.path}`
      routeCount[key] = routeCount[key] ? routeCount[key] + 1 : 1
      if (routeCount[key] > 1) {
        return
      }

      return {
        key,
        line: `\x1b[32m${route.method}\x1b[0m ${' '.repeat(length - route.method.length)} ${
          route.path
        }`,
      }
    })
    .filter((value): value is { key: string; line: string } => value !== undefined)
    .forEach(({ key, line }) => {
      console.log(`${line}${routeCount[key] > 1 ? ` ${routeCount[key]}` : ''}`)
    })
}
