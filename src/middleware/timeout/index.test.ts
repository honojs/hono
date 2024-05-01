import { Hono } from '../../hono'
import { timeout } from '.'

describe('Timeout API', () => {
  const app = new Hono()

  app.use('/slow-endpoint', timeout(1000))
  app.get('/slow-endpoint', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 1100))
    return c.text('This should not show up')
  })

  it('Should contain total duration', async () => {
    const res = await app.request('http://localhost/slow-endpoint')
    expect(res).not.toBeNull()
    expect(res.status).toBe(504)
    expect(await res.text()).toContain('Gateway Timeout')
  })
})
