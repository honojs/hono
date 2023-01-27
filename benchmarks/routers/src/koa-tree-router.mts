import KoaRouter from 'koa-tree-router'
import type { RouterInterface } from './tool.mts'
import { routes, handler } from './tool.mts'

const name = 'koa-tree-router'
const router = new KoaRouter()

for (const route of routes) {
  router.on(route.method, route.path.replace('*', '*foo'), handler)
}

export const koaTreeRouter: RouterInterface = {
  name,
  match: (route) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    router.find(route.method, route.path)
  },
}
