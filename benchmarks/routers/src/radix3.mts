import { createRouter } from 'radix3'
import type { RouterInterface } from './tool.mts'
import { routes, handler } from './tool.mts'

const name = 'radix3'
const router = createRouter()

for (const route of routes) {
  router.insert(route.path, handler)
}

export const radix3Router: RouterInterface = {
  name,
  match: (route) => {
    router.lookup(route.path)
  },
}
