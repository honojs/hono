import type { Router } from '../../../deno_dist/router.ts'
import { RegExpRouter } from '../../../deno_dist/router/reg-exp-router/index.ts'
import { TrieRouter } from '../../../deno_dist/router/trie-router/index.ts'
import { PatternRouter } from '../../../deno_dist/router/pattern-router/index.ts'
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
