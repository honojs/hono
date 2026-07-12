import express from 'express'
import type { RouterInterface } from './tool.mts'
import { routes, handler } from './tool.mts'

const router = express.Router()
const name = 'express (WARNING: includes handling)'

for (const route of routes) {
  // path-to-regexp v8 (express 5) requires named wildcards
  const path = route.path.replace(/\/\*$/, '/*splat')
  if (route.method === 'GET') {
    router.route(path).get(handler)
  } else {
    router.route(path).post(handler)
  }
}

export const expressRouter: RouterInterface = {
  name,
  match: (route) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(router as any).handle({ method: route.method, url: route.path }, {}, () => {})
  },
}
