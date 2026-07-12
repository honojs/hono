import KoaRouter from 'koa-router'
import type { RouterInterface } from './tool.mts'
import { routes, handler } from './tool.mts'

const name = 'koa-router'
const router = new KoaRouter()

for (const route of routes) {
  if (route.method === 'GET') {
    // path-to-regexp v8 (koa-router 14) requires named wildcards
    router.get(route.path.replace(/\/\*$/, '/*splat'), handler)
  } else {
    router.post(route.path, handler)
  }
}

export const koaRouter: RouterInterface = {
  name,
  match: (route) => {
    router.match(route.path, route.method) // only matching
  },
}
