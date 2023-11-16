import type { Hono } from '../../hono'

interface RouterRoute {
  method: string
  path: string
  handler: Function
}

type Writer<T = {}> = (
  data: {
    method: string
    path: string
    routes: RouterRoute[]
    maxPathLength: number
    maxHandlerNameLength: number
  } & T
) => void

interface ShowRoutesOptionsCommon {
  includeMiddleware?: boolean
}

interface DefaultWriterOptions {
  showList?: boolean
}

type ShowRoutesOptions =
  | (ShowRoutesOptionsCommon & { writer: Writer })
  | (ShowRoutesOptionsCommon & DefaultWriterOptions)

const handlerName = (handler: Function) => {
  return handler.name || (handler.length === 1 ? '[handler]' : '[middleware]')
}

const honoBaseRe = /hono-base|\/node_modules\/hono/
const defaultWriter: Writer<DefaultWriterOptions> = ({
  method,
  path,
  routes,
  maxPathLength,
  maxHandlerNameLength,
  showList,
}) => {
  const length = 8
  console.log(
    `\x1b[32m${method}\x1b[0m ${' '.repeat(length - method.length)} ${path}${
      routes.length > 1 ? `${' '.repeat(maxPathLength - path.length + 2)}` : ''
    }`
  )
  if (!showList) {
    return
  }

  routes.forEach((route) => {
    let file = ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((route as any).stack) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stack = (route as any).stack.split('\n').reverse()
      const honoBaseIndex = stack.findIndex((line: string) => !!line.match(honoBaseRe))
      if (honoBaseIndex !== -1) {
        file = (stack[honoBaseIndex - 1].match(/(\S+:\d+:\d+)/)?.[1] || '').replace(
          /\(|file:\/\//g,
          ''
        )
      }
    }

    const name = handlerName(route.handler)
    console.log(
      `${' '.repeat(length + 4)} ${name}${
        file ? `${' '.repeat(maxHandlerNameLength - name.length + 2)}${file}` : ''
      }`
    )
  })
}

export const showRoutes = (hono: Hono, opts?: ShowRoutesOptions) => {
  const routeData: Record<string, RouterRoute[]> = {}
  let maxPathLength = 0
  let maxHandlerNameLength = 0
  hono.routes
    .filter(({ handler }) => opts?.includeMiddleware || handler.length === 1)
    .map((route) => {
      const key = `${route.method}-${route.path}`
      ;(routeData[key] ||= []).push(route)
      if (routeData[key].length > 1) {
        return
      }
      maxPathLength = Math.max(maxPathLength, route.path.length)
      maxHandlerNameLength = Math.max(maxHandlerNameLength, handlerName(route.handler).length)
      return { key, method: route.method, path: route.path }
    })
    .forEach((data) => {
      if (!data) {
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;((opts as any)?.writer || defaultWriter)({
        ...opts,
        ...data,
        routes: routeData[data.key],
        maxPathLength,
        maxHandlerNameLength,
      })
    })
}

export const captureRouteStackTrace = (app: Hono) => {
  app.routes = new Proxy(app.routes, {
    get(target, prop) {
      if (prop === 'push') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (route: any) => {
          Error.captureStackTrace(route)
          target.push(route)
          return target
        }
      }
      return Reflect.get(target, prop)
    },
  })
}
