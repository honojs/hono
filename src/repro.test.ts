import { Hono } from './hono'

describe('JSON serialization of undefined', () => {
  it('should return valid JSON or consistent body for c.json(undefined)', async () => {
    const app = new Hono()
    app.get('/', (c) => c.json(undefined as any))
    const res = await app.request('/')
    const body = await res.text()
    expect(body).toBe('null')
  })
})
