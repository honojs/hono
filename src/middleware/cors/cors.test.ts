import { Hono } from '../../hono'
import { Middleware } from '../../middleware'

describe('CORS by Middleware', () => {
  const app = new Hono()

  app.use('/api/*', Middleware.cors())
  app.use(
    '/api2/*',
    Middleware.cors({
      origin: 'http://example.com',
      allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests'],
      allowMethods: ['POST', 'GET', 'OPTIONS'],
      exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
      maxAge: 600,
      credentials: true,
    })
  )

  app.all('/api/abc', (c) => {
    return c.json({ success: true })
  })
  app.all('/api2/abc', (c) => {
    return c.json({ success: true })
  })

  it('GET default', async () => {
    const req = new Request('http://localhost/api/abc')
    const res = await app.dispatch(req)

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Vary')).toBeNull()
  })

  it('Preflight default', async () => {
    const req = new Request('https://localhost/api/abc', { method: 'OPTIONS' })
    req.headers.append('Access-Control-Request-Headers', 'X-PINGOTHER, Content-Type')
    const res = await app.dispatch(req)

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Methods').split(',')[0]).toBe('GET')
    expect(res.headers.get('Access-Control-Allow-Headers').split(',')).toEqual(['X-PINGOTHER', 'Content-Type'])
  })

  it('Preflight with options', async () => {
    const req = new Request('https://localhost/api2/abc', { method: 'OPTIONS' })
    const res = await app.dispatch(req)

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')
    expect(res.headers.get('Vary').split(/\s*,\s*/)).toEqual(expect.arrayContaining(['Origin']))
    expect(res.headers.get('Access-Control-Allow-Headers').split(/\s*,\s*/)).toEqual([
      'X-Custom-Header',
      'Upgrade-Insecure-Requests',
    ])
    expect(res.headers.get('Access-Control-Allow-Methods').split(/\s*,\s*/)).toEqual(['POST', 'GET', 'OPTIONS'])
    expect(res.headers.get('Access-Control-Expose-Headers').split(/\s*,\s*/)).toEqual([
      'Content-Length',
      'X-Kuma-Revision',
    ])
    expect(res.headers.get('Access-Control-Max-Age')).toBe('600')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })
})
