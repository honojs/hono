import { RegExpRouter } from '../../../src/router/reg-exp-router/index.ts'
import { TrieRouter } from '../../../src/router/trie-router/index.ts'
import { PatternRouter } from '../../../src/router/pattern-router/index.ts'
import { OptimizeRouter } from './../../../src/router/optimize-router/index.ts';
import type { Router } from '../../../src/router.ts'
import type { RouterInterface } from './tool.mts'
import { routes, handler } from './tool.mts'

const createHonoRouter = (name: string, router: Router<unknown>): RouterInterface => {
  for (const route of routes) {
    router.add(route.method, route.path, handler)
  }
  return {
    name: `Hono ${name}`,
    match: (route) => {
      router.match(route.method, route.path)
    },
  }
}

export const regExpRouter = createHonoRouter('RegExpRouter', new RegExpRouter())
export const trieRouter = createHonoRouter('TrieRouter', new TrieRouter())
export const patternRouter = createHonoRouter('PatternRouter', new PatternRouter())
export const optimizedRouters = [
  createHonoRouter('Optimized TrieRouter', new OptimizeRouter({
    router: new TrieRouter(),
  })),
  createHonoRouter('Optimized PatternRouter', new OptimizeRouter({
    router: new PatternRouter(),
  })),
]
