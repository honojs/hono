import TrekRouter from 'npm:trek-router'
import type { RouterInterface } from './tool.mts'
import { routes, handler } from './tool.mts'

const name = 'trek-router'

const router = new TrekRouter()
for (const route of routes) {
  router.add(route.method, route.path, handler())
}

export const trekRouter: RouterInterface = {
  name,
  match: (route) => {
    router.find(route.method, route.path)
  },
}
