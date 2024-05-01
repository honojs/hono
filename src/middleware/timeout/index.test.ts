import { Hono } from '../../hono'
import { timeout } from '.'

describe('Timeout API', () => {
  const app = new Hono()
  app.use('/slow-endpoint', timeout(1000))
  app.use(
    '/slow-endpoint/custom',
    timeout(1000, {
      errorMessage: 'Request timeout. Please try again later.',
      errorCode: 504,
    })
  )

  app.get('/slow-endpoint', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 1100))
    return c.text('This should not show up')
  })

  app.get('/slow-endpoint/custom', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 1100))
    return c.text('This should not show up')
  })

  it('Should contain total duration', async () => {
    const res = await app.request('http://localhost/slow-endpoint')
    expect(res).not.toBeNull()
    expect(res.status).toBe(408)
    expect(await res.text()).toContain('Gateway Timeout')
  })

  it('Should apply custom error message and status code', async () => {
    const res = await app.request('http://localhost/slow-endpoint/custom')
    expect(res).not.toBeNull()
    expect(res.status).toBe(504)
    expect(await res.text()).toContain('Request timeout. Please try again later.')
  })
})
