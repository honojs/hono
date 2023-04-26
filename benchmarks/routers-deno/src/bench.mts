import { run, bench, group } from 'npm:mitata'
import { findMyWayRouter } from './find-my-way.mts'
import { regExpRouter, trieRouter, patternRouter } from './hono.mts'
import { koaRouter } from './koa-router.mts'
import { koaTreeRouter } from './koa-tree-router.mts'
import { medleyRouter } from './medley-router.mts'
import type { Route, RouterInterface } from './tool.mts'
import { trekRouter } from './trek-router.mts'

const routers: RouterInterface[] = [
  regExpRouter,
  trieRouter,
  patternRouter,
  medleyRouter,
  findMyWayRouter,
  koaTreeRouter,
  trekRouter,
  koaRouter,
]

medleyRouter.match({ method: 'GET', path: '/user' })

const routes: (Route & { name: string })[] = [
  {
    name: 'short static',
    method: 'GET',
    path: '/user',
  },
  {
    name: 'static with same radix',
    method: 'GET',
    path: '/user/comments',
  },
  {
    name: 'dynamic route',
    method: 'GET',
    path: '/user/lookup/username/hey',
  },
  {
    name: 'mixed static dynamic',
    method: 'GET',
    path: '/event/abcd1234/comments',
  },
  {
    name: 'post',
    method: 'POST',
    path: '/event/abcd1234/comment',
  },
  {
    name: 'long static',
    method: 'GET',
    path: '/very/deeply/nested/route/hello/there',
  },
  {
    name: 'wildcard',
    method: 'GET',
    path: '/static/index.html',
  },
]

for (const route of routes) {
  group(`${route.name} - ${route.method} ${route.path}`, () => {
    for (const router of routers) {
      bench(router.name, async () => {
        router.match(route)
      })
    }
  })
}

group('all together', () => {
  for (const router of routers) {
    bench(router.name, async () => {
      for (const route of routes) {
        router.match(route)
      }
    })
  }
})

await run()
