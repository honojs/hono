import type { Context } from '../../context'
import { Hono } from '../../hono'
import { HTTPException } from '../../http-exception'
import type { HTTPExceptionFunction } from '.'
import { timeout } from '.'

describe('Timeout API', () => {
  const app = new Hono()

  app.use('/slow-endpoint', timeout(1000))
  app.use(
    '/slow-endpoint/custom',
    timeout(
      1100,
      () => new HTTPException(408, { message: 'Request timeout. Please try again later.' })
    )
  )
  const exception500: HTTPExceptionFunction = (context: Context) =>
    new HTTPException(500, { message: `Internal Server Error at ${context.req.path}` })
  app.use('/slow-endpoint/error', timeout(1200, exception500))
  app.use('/normal-endpoint', timeout(1000))

  app.get('/slow-endpoint', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 1100))
    return c.text('This should not show up')
  })

  app.get('/slow-endpoint/custom', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    return c.text('This should not show up')
  })

  app.get('/slow-endpoint/error', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 1300))
    return c.text('This should not show up')
  })

  app.get('/normal-endpoint', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 900))
    return c.text('This should not show up')
  })

  it('Should trigger default timeout exception', async () => {
    const res = await app.request('http://localhost/slow-endpoint')
    expect(res).not.toBeNull()
    expect(res.status).toBe(504)
    expect(await res.text()).toContain('Gateway Timeout')
  })

  it('Should apply custom exception with function', async () => {
    const res = await app.request('http://localhost/slow-endpoint/custom')
    expect(res).not.toBeNull()
    expect(res.status).toBe(408)
    expect(await res.text()).toContain('Request timeout. Please try again later.')
  })

  it('Error timeout with custom status code and message', async () => {
    const res = await app.request('http://localhost/slow-endpoint/error')
    expect(res).not.toBeNull()
    expect(res.status).toBe(500)
    expect(await res.text()).toContain('Internal Server Error at /slow-endpoint/error')
  })

  it('No Timeout should pass', async () => {
    const res = await app.request('http://localhost/normal-endpoint')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('This should not show up')
  })
})
