import { matchedRoutes } from '../../helper/route'
import { Hono } from '../../hono'
import type { Result, Router } from '../../router'
import type { H, Handler, MiddlewareHandler, RouterRoute } from '../../types'
import { RegExpRouter } from '../reg-exp-router'
import { TransformRouter } from './router'

describe('TransformRouter', () => {
  it('transforms registrations and delegates matching', () => {
    const routeHandler: H = vi.fn()
    const currentHandler: H = vi.fn()
    const transformedHandler: H = vi.fn()
    const route: RouterRoute = {
      basePath: '/',
      method: 'GET',
      path: '/posts',
      handler: routeHandler,
    }
    const matchResult: Result<[H, RouterRoute]> = [[[[transformedHandler, route], {}]]]
    const added: [string, string, [H, RouterRoute]][] = []
    const matched: [string, string][] = []
    const delegateRouter: Router<[H, RouterRoute]> = {
      name: 'DelegateRouter',
      add(method, path, handler) {
        added.push([method, path, handler])
      },
      match(method, path) {
        matched.push([method, path])
        return matchResult
      },
    }
    const transform = vi.fn((_route: Readonly<RouterRoute>) => transformedHandler)
    const router = new TransformRouter({ delegateRouter, transform })

    router.add('GET', '/posts', [currentHandler, route])
    const result = router.match('POST', '/comments')

    expect(transform).toHaveBeenCalledWith({ ...route, handler: currentHandler })
    expect(added).toEqual([['GET', '/posts', [transformedHandler, route]]])
    expect(route.handler).toBe(routeHandler)
    expect(matched).toEqual([['POST', '/comments']])
    expect(result).toBe(matchResult)
    expect(router.name).toBe('TransformRouter + DelegateRouter')
  })

  it('wraps Hono handlers without changing route metadata', async () => {
    const events: string[] = []
    const registrations: string[] = []
    const app = new Hono({
      router: new TransformRouter({
        delegateRouter: new RegExpRouter(),
        transform: ({ handler, method, path }) => {
          registrations.push(`${method} ${path}`)
          return async (c, next) => {
            events.push(`start:${handler.name}`)
            try {
              return await handler(c, next)
            } finally {
              events.push(`end:${handler.name}`)
            }
          }
        },
      }),
    })

    const middleware: MiddlewareHandler = async function middleware(_c, next) {
      events.push('middleware:before')
      await next()
      events.push('middleware:after')
    }

    const handler: Handler = function handler(c) {
      events.push('handler')
      expect(matchedRoutes(c).map((route) => route.handler)).toEqual([middleware, handler])
      return c.text('ok')
    }

    app.use('/posts/*', middleware)
    app.get('/posts/:id', handler)

    const res = await app.request('/posts/123')

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
    expect(registrations).toEqual(['ALL /posts/*', 'GET /posts/:id'])
    expect(app.router.name).toBe('TransformRouter + RegExpRouter')
    expect(app.routes.map((route) => route.handler)).toEqual([middleware, handler])
    expect(events).toEqual([
      'start:middleware',
      'middleware:before',
      'start:handler',
      'handler',
      'end:handler',
      'middleware:after',
      'end:middleware',
    ])
  })

  it('observes errors before Hono handles them', async () => {
    const errors: string[] = []
    const router = new TransformRouter({
      delegateRouter: new RegExpRouter(),
      transform: ({ handler, path }) => {
        return async (c, next) => {
          try {
            return await handler(c, next)
          } catch (error) {
            errors.push(`${path}: ${(error as Error).message}`)
            throw error
          }
        }
      },
    })
    const app = new Hono({ router })

    app.get('/error', () => {
      throw new Error('boom')
    })
    app.onError((error, c) => c.text(error.message, 500))

    const res = await app.request('/error')

    expect(res.status).toBe(500)
    expect(await res.text()).toBe('boom')
    expect(errors).toEqual(['/error: boom'])
  })
})
