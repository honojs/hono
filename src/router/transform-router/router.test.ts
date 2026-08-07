import { matchedRoutes } from '../../helper/route'
import { Hono } from '../../hono'
import type { Result, Router } from '../../router'
import type { H, Handler, MiddlewareHandler, RouterRoute } from '../../types'
import { runTest } from '../common.case.test'
import { RegExpRouter } from '../reg-exp-router'
import { TransformRouter } from './router'

describe('TransformRouter', () => {
  runTest({
    newRouter: <T>() =>
      new TransformRouter<T>({
        transform: (handler) => handler,
      }),
  })

  it('transforms registrations and delegates matching', () => {
    const matchResult: Result<string> = [[['matched', {}]]]
    const added: [string, string, string][] = []
    const matched: [string, string][] = []
    const delegateRouter: Router<string> = {
      name: 'DelegateRouter',
      add(method, path, handler) {
        added.push([method, path, handler])
      },
      match(method, path) {
        matched.push([method, path])
        return matchResult
      },
    }
    const transform = vi.fn((handler: string, method: string, path: string) => {
      return `${method} ${path}: ${handler}`
    })
    const router = new TransformRouter({ delegateRouter, transform })

    router.add('GET', '/posts', 'handler')
    const result = router.match('POST', '/comments')

    expect(transform).toHaveBeenCalledWith('handler', 'GET', '/posts')
    expect(added).toEqual([['GET', '/posts', 'GET /posts: handler']])
    expect(matched).toEqual([['POST', '/comments']])
    expect(result).toBe(matchResult)
    expect(router.name).toBe('TransformRouter + DelegateRouter')
  })

  it('wraps Hono handlers without changing route metadata', async () => {
    const events: string[] = []
    const registrations: string[] = []
    const app = new Hono({
      router: new TransformRouter({
        transform: ([handler, route], method, path) => {
          registrations.push(`${method} ${path}`)
          const wrapped: H = async (c, next) => {
            events.push(`start:${route.handler.name}`)
            try {
              return await handler(c, next)
            } finally {
              events.push(`end:${route.handler.name}`)
            }
          }
          return [wrapped, route]
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
    expect(app.router.name).toBe('TransformRouter + SmartRouter + RegExpRouter')
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
    const router = new TransformRouter<[H, RouterRoute]>({
      delegateRouter: new RegExpRouter(),
      transform: ([handler, route]) => {
        const wrapped: H = async (c, next) => {
          try {
            return await handler(c, next)
          } catch (error) {
            errors.push(`${route.path}: ${(error as Error).message}`)
            throw error
          }
        }
        return [wrapped, route]
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
