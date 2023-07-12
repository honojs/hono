import routerFunc from 'express/lib/router/index.js'
import type { RouterInterface } from './tool.mts'
import { routes, handler } from './tool.mts'

const router = routerFunc()
const name = 'express (WARNING: includes handling)'

for (const route of routes) {
  if (route.method === 'GET') {
    router.route(route.path).get(handler)
  } else {
    router.route(route.path).post(handler)
  }
}

export const expressRouter: RouterInterface = {
  name,
  match: (route) => {
    router.handle({ method: route.method, url: route.path })
  },
}
