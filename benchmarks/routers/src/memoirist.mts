import { Memoirist } from 'memoirist'
import type { RouterInterface } from './tool.mts'
import { routes, handler } from './tool.mts'

const name = 'Memoirist'
const router = new Memoirist()

for (const route of routes) {
  router.add(route.method, route.path, handler)
}

export const memoiristRouter: RouterInterface = {
  name,
  match: (route) => {
    router.find(route.method, route.path)
  },
}
