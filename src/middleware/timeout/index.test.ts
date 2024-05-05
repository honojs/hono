import { Hono } from '../../hono'
import { timeout } from '.'

describe('Timeout API', () => {
  const app = new Hono()
  app.use('/slow-endpoint', timeout(1000))
  app.use(
    '/slow-endpoint/custom',
    timeout('1s100ms', {
      errorMessage: 'Request timeout. Please try again later.',
      errorCode: 408,
    })
  )
  app.use(
    '/slow-endpoint/error',
    timeout('1s2000ms', {
      errorMessage: 'Request timeout. Please try again later.',
      errorCode: 408,
    })
  )
  app.use('/normal-endpoint', timeout(1000))

  app.get('/slow-endpoint', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 1100))
    return c.text('This should not show up')
  })

  app.get('/slow-endpoint/custom', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 1100))
    return c.text('This should not show up')
  })

  app.get('/slow-endpoint/error', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 1100))
    return c.text('This should not show up')
  })

  app.get('/normal-endpoint', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 900))
    return c.text('This should not show up')
  })

  it('Should contain total duration', async () => {
    const res = await app.request('http://localhost/slow-endpoint')
    expect(res).not.toBeNull()
    expect(res.status).toBe(504)
    expect(await res.text()).toContain('Gateway Timeout')
  })

  it('Should apply custom error message and status code', async () => {
    const res = await app.request('http://localhost/slow-endpoint/custom')
    expect(res).not.toBeNull()
    expect(res.status).toBe(408)
    expect(await res.text()).toContain('Request timeout. Please try again later.')
  })

  it('Error timeout', async () => {
    const res = await app.request('http://localhost/slow-endpoint/error')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200) // Confirming the endpoint does not trigger a timeout as expected
    expect(await res.text()).toContain('This should not show up')
  })

  it('No Timeout', async () => {
    const res = await app.request('http://localhost/normal-endpoint')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('This should not show up')
  })
})
