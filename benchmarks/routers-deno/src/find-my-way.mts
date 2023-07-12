import type { HTTPMethod } from 'npm:find-my-way'
import findMyWay from 'npm:find-my-way'
import type { RouterInterface } from './tool.mts'
import { routes, handler } from './tool.mts'

const name = 'find-my-way'
const router = findMyWay()

for (const route of routes) {
  router.on(route.method as HTTPMethod, route.path, handler)
}

export const findMyWayRouter: RouterInterface = {
  name,
  match: (route) => {
    router.find(route.method as HTTPMethod, route.path)
  },
}
