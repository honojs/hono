import Router from 'npm:@medley/router'
import type { RouterInterface } from './tool.mts'
import { routes, handler } from './tool.mts'

const name = '@medley/router'
const router = new Router()

for (const route of routes) {
  const store = router.register(route.path)
  store[route.method] = handler
}

export const medleyRouter: RouterInterface = {
  name,
  match: (route) => {
    const match = router.find(route.path)
    match.store[route.method] // get handler
  },
}
