import { Hono } from '../../hono'
import { cors } from '../../middleware/cors'

describe('CORS by Middleware', () => {
  const app = new Hono()

  app.use('/api/*', cors())
  app.use(
    '/api2/*',
    cors({
      origin: 'http://example.com',
      allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests'],
      allowMethods: ['POST', 'GET', 'OPTIONS'],
      exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
      maxAge: 600,
      credentials: true,
    })
  )

  app.use(
    '/api3/*',
    cors({
      origin: ['http://example.com', 'http://example.org', 'http://example.dev'],
    })
  )

  app.use(
    '/api4/*',
    cors({
      origin: (origin) => (origin.endsWith('.example.com') ? origin : 'http://example.com'),
    })
  )

  app.use('/api5/*', cors())

  app.use(
    '/api6/*',
    cors({
      origin: 'http://example.com',
    })
  )
  app.use(
    '/api6/*',
    cors({
      origin: 'http://example.com',
    })
  )

  app.get('/api/abc', (c) => {
    return c.json({ success: true })
  })
  app.get('/api2/abc', (c) => {
    return c.json({ success: true })
  })
  app.get('/api3/abc', (c) => {
    return c.json({ success: true })
  })
  app.get('/api4/abc', (c) => {
    return c.json({ success: true })
  })
  app.get('/api5/abc', () => {
    return new Response(JSON.stringify({ success: true }))
  })

  it('GET default', async () => {
    const res = await app.request('http://localhost/api/abc')

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Vary')).toBeNull()
  })

  it('Preflight default', async () => {
    const req = new Request('https://localhost/api/abc', { method: 'OPTIONS' })
    req.headers.append('Access-Control-Request-Headers', 'X-PINGOTHER, Content-Type')
    const res = await app.request(req)

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Methods')?.split(',')[0]).toBe('GET')
    expect(res.headers.get('Access-Control-Allow-Headers')?.split(',')).toEqual([
      'X-PINGOTHER',
      'Content-Type',
    ])
  })

  it('Preflight with options', async () => {
    const req = new Request('https://localhost/api2/abc', { method: 'OPTIONS' })
    const res = await app.request(req)

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')
    expect(res.headers.get('Vary')?.split(/\s*,\s*/)).toEqual(expect.arrayContaining(['Origin']))
    expect(res.headers.get('Access-Control-Allow-Headers')?.split(/\s*,\s*/)).toEqual([
      'X-Custom-Header',
      'Upgrade-Insecure-Requests',
    ])
    expect(res.headers.get('Access-Control-Allow-Methods')?.split(/\s*,\s*/)).toEqual([
      'POST',
      'GET',
      'OPTIONS',
    ])
    expect(res.headers.get('Access-Control-Expose-Headers')?.split(/\s*,\s*/)).toEqual([
      'Content-Length',
      'X-Kuma-Revision',
    ])
    expect(res.headers.get('Access-Control-Max-Age')).toBe('600')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('Allow multiple origins', async () => {
    let req = new Request('http://localhost/api3/abc', {
      headers: {
        Origin: 'http://example.org',
      },
    })
    let res = await app.request(req)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.org')

    req = new Request('http://localhost/api3/abc')
    res = await app.request(req)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')

    req = new Request('http://localhost/api3/abc', {
      headers: {
        Referer: 'http://example.net/',
      },
    })
    res = await app.request(req)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')
  })

  it('Allow origins by function', async () => {
    let req = new Request('http://localhost/api4/abc', {
      headers: {
        Origin: 'http://subdomain.example.com',
      },
    })
    let res = await app.request(req)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://subdomain.example.com')

    req = new Request('http://localhost/api4/abc')
    res = await app.request(req)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')

    req = new Request('http://localhost/api4/abc', {
      headers: {
        Referer: 'http://evil-example.com/',
      },
    })
    res = await app.request(req)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')
  })

  it('With raw Response object', async () => {
    const res = await app.request('http://localhost/api5/abc')

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Vary')).toBeNull()
  })

  it('Should not return duplicate header values', async () => {
    const res = await app.request('http://localhost/api6/abc')

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')
  })
})
