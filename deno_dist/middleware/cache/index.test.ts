import { Hono } from '../../hono.ts'
import { cache } from './index.ts'

// Mock
class Context implements ExecutionContext {
  passThroughOnException(): void {
    throw new Error('Method not implemented.')
  }
  async waitUntil(promise: Promise<unknown>): Promise<void> {
    await promise
  }
}

describe('Cache Middleware', () => {
  const app = new Hono()

  let count = 1
  // wait, because this is test.
  // You don't have to set `wait: true`.
  app.use('/wait/*', cache({ cacheName: 'my-app-v1', wait: true, cacheControl: 'max-age=10' }))
  app.get('/wait/', (c) => {
    c.header('X-Count', `${count}`)
    count++
    return c.text('cached')
  })

  // Default, use `waitUntil`
  app.use('/not-wait/*', cache({ cacheName: 'my-app-v1', cacheControl: 'max-age=10' }))
  app.get('/not-wait/', (c) => {
    return c.text('not cached')
  })

  app.use('/wait2/*', cache({ cacheName: 'my-app-v1', wait: true, cacheControl: 'max-age=10' }))
  app.use('/wait2/*', cache({ cacheName: 'my-app-v1', wait: true, cacheControl: 'max-age=10' }))
  app.get('/wait2/', (c) => {
    return c.text('cached')
  })

  app.use('/not-found/*', cache({ cacheName: 'my-app-v1', wait: true, cacheControl: 'max-age=10' }))

  const ctx = new Context()

  it('Should return cached response', async () => {
    await app.request('http://localhost/wait/')
    const res = await app.request('http://localhost/wait/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('max-age=10')
    expect(res.headers.get('cf-cache-status')).toBe('HIT')
    expect(res.headers.get('x-count')).toBe('1')
  })

  it('Should not return cached response', async () => {
    await app.fetch(new Request('http://localhost/not-wait/'), undefined, ctx)
    const res = await app.fetch(new Request('http://localhost/not-wait/'), undefined, ctx)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('max-age=10')
    expect(res.headers.get('cf-cache-status')).toBeNull()
  })

  it('Should not return duplicate header values', async () => {
    const res = await app.request('/wait2/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('max-age=10')
  })

  it('Should not cache if it is not found', async () => {
    const res = await app.request('/not-found/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toBeFalsy()
  })
})
