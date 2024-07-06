import { addRoute, createRouter, findRoute } from 'rou3'
import type { RouterInterface } from './tool.mts'
import { handler, routes } from './tool.mts'

const name = 'rou3'
const router = createRouter()

for (const route of routes) {
  addRoute(router, route.path, route.method, handler)
}

export const rou3Router: RouterInterface = {
  name,
  match: (route) => {
    findRoute(router, route.path, route.method, {
      ignoreParams: false, // Don't ignore params
    })
  },
}
