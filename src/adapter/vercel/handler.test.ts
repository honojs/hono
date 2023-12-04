/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hono } from '../../hono'
import { handle } from './handler'

describe('Adapter for Next.js', () => {
  it('Should return 200 response with a `waitUntil` value', async () => {
    const app = new Hono()
    app.get('/api/foo', async (c) => {
      return c.json({
        path: '/api/foo',
        /**
         * Checking if the `waitUntil` value is passed.
         */
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        waitUntil: c.executionCtx.waitUntil() as any,
      })
    })
    const handler = handle(app)
    const req = new Request('http://localhost/api/foo')
    const res = await handler(req, { waitUntil: () => 'waitUntil' } as any)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      path: '/api/foo',
      waitUntil: 'waitUntil',
    })
  })

  it('Should not use `route()` if path argument is not passed', async () => {
    const app = new Hono().basePath('/api')

    app.onError((e) => {
      throw e
    })
    app.get('/error', () => {
      throw new Error('Custom Error')
    })

    const handler = handle(app)
    const req = new Request('http://localhost/api/error')
    expect(() =>
      handler(req, {
        waitUntil: () => {},
      } as any)
    ).toThrowError('Custom Error')
  })
})
