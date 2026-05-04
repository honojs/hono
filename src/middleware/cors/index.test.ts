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

  app.use(
    '/api7/*',
    cors({
      origin: (origin) => (origin === 'http://example.com' ? origin : '*'),
      allowMethods: (origin) =>
        origin === 'http://example.com'
          ? ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE']
          : ['GET', 'HEAD'],
    })
  )

  app.use(
    '/api8/*',
    cors({
      origin: (origin) =>
        new Promise<string>((resolve) =>
          resolve(origin.endsWith('.example.com') ? origin : 'http://example.com')
        ),
    })
  )

  app.use(
    '/api9/*',
    cors({
      origin: (origin) =>
        new Promise<string>((resolve) => resolve(origin === 'http://example.com' ? origin : '*')),
      allowMethods: (origin) =>
        new Promise<string[]>((resolve) =>
          resolve(
            origin === 'http://example.com'
              ? ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE']
              : ['GET', 'HEAD']
          )
        ),
    })
  )

  app.use(
    '/api10/*',
    cors({
      origin: '*',
      credentials: true,
    })
  )

  app.get('/api/abc', (c) => {
    return c.json({ success: true })
  })

  app.get('/api/vary-header', () => {
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        Vary: 'X-Custom-Vary-Value',
      },
    })
  })

  app.get('/api2/abc', (c) => {
    return c.json({ success: true })
  })

  app.get('/api3/abc', (c) => {
    return c.json({ success: true })
  })

  app.get('/api3/vary-header', () => {
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        Vary: 'X-Custom-Vary-Value',
      },
    })
  })

  app.get('/api4/abc', (c) => {
    return c.json({ success: true })
  })

  app.get('/api5/abc', () => {
    return new Response(JSON.stringify({ success: true }))
  })

  app.get('/api7/abc', () => {
    return new Response(JSON.stringify({ success: true }))
  })

  app.get('/api10/abc', (c) => {
    return c.json({ success: true })
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
    expect(res.statusText).toBe('No Content')
    expect(res.headers.get('Access-Control-Allow-Methods')?.split(',')[0]).toBe('GET')
    expect(res.headers.get('Access-Control-Allow-Headers')?.split(',')).toEqual([
      'X-PINGOTHER',
      'Content-Type',
    ])
  })

  it('Preflight with options', async () => {
    const req = new Request('https://localhost/api2/abc', {
      method: 'OPTIONS',
      headers: { origin: 'http://example.com' },
    })
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

  it('Disallow an unmatched origin', async () => {
    const req = new Request('https://localhost/api2/abc', {
      method: 'OPTIONS',
      headers: { origin: 'http://example.net' },
    })
    const res = await app.request(req)
    expect(res.headers.has('Access-Control-Allow-Origin')).toBeFalsy()
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
    expect(
      res.headers.has('Access-Control-Allow-Origin'),
      'An unmatched origin should be disallowed'
    ).toBeFalsy()

    req = new Request('http://localhost/api3/abc', {
      headers: {
        Referer: 'http://example.net/',
      },
    })
    res = await app.request(req)
    expect(
      res.headers.has('Access-Control-Allow-Origin'),
      'An unmatched origin should be disallowed'
    ).toBeFalsy()
  })

  it('Set "Origin" to Vary header', async () => {
    const res = await app.request('http://localhost/api3/abc', {
      headers: {
        Origin: 'http://example.com',
      },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')
    expect(res.headers.get('Vary')).toBe('Origin')
  })

  it('Keep original Vary header', async () => {
    const res = await app.request('http://localhost/api/vary-header', {
      headers: {
        Origin: 'http://example.com',
      },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Vary')).toBe('X-Custom-Vary-Value')
  })

  it('Append "Origin" to Vary header, if response has some Vary header', async () => {
    const res = await app.request('http://localhost/api3/vary-header', {
      headers: {
        Origin: 'http://example.com',
      },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')
    expect(res.headers.get('Vary')).toBe('X-Custom-Vary-Value, Origin')
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

  it('Allow origins by promise returning function', async () => {
    let req = new Request('http://localhost/api8/abc', {
      headers: {
        Origin: 'http://subdomain.example.com',
      },
    })
    let res = await app.request(req)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://subdomain.example.com')

    req = new Request('http://localhost/api8/abc')
    res = await app.request(req)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')

    req = new Request('http://localhost/api8/abc', {
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
    const res = await app.request('http://localhost/api6/abc', {
      headers: {
        origin: 'http://example.com',
      },
    })

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')
  })

  it('Allow methods by function', async () => {
    const req = new Request('http://localhost/api7/abc', {
      headers: {
        Origin: 'http://example.com',
      },
      method: 'OPTIONS',
    })
    const res = await app.request(req)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET,HEAD,POST,PATCH,DELETE')

    const req2 = new Request('http://localhost/api7/abc', {
      headers: {
        Origin: 'http://example.org',
      },
      method: 'OPTIONS',
    })
    const res2 = await app.request(req2)
    expect(res2.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res2.headers.get('Access-Control-Allow-Methods')).toBe('GET,HEAD')
  })

  it('Allow methods by promise returning function', async () => {
    const req = new Request('http://localhost/api9/abc', {
      headers: {
        Origin: 'http://example.com',
      },
      method: 'OPTIONS',
    })
    const res = await app.request(req)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET,HEAD,POST,PATCH,DELETE')

    const req2 = new Request('http://localhost/api9/abc', {
      headers: {
        Origin: 'http://example.org',
      },
      method: 'OPTIONS',
    })
    const res2 = await app.request(req2)
    expect(res2.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res2.headers.get('Access-Control-Allow-Methods')).toBe('GET,HEAD')
  })

  it('Reflect request origin when credentials is true with wildcard origin', async () => {
    const res = await app.request('http://localhost/api10/abc', {
      headers: {
        Origin: 'http://example.com',
      },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(res.headers.get('Vary')).toBe('Origin')
  })

  it('Preflight: reflect request origin when credentials is true with wildcard origin', async () => {
    const req = new Request('http://localhost/api10/abc', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://example.com',
      },
    })
    const res = await app.request(req)

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(res.headers.get('Vary')?.split(/\s*,\s*/)).toEqual(expect.arrayContaining(['Origin']))
  })

  it('Should not set Allow-Origin when no Origin header with credentials and wildcard', async () => {
    const res = await app.request('http://localhost/api10/abc')

    expect(res.status).toBe(200)
    expect(res.headers.has('Access-Control-Allow-Origin')).toBeFalsy()
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('Reflect different origins correctly for credentials with wildcard', async () => {
    const res1 = await app.request('http://localhost/api10/abc', {
      headers: { Origin: 'http://example.com' },
    })
    const res2 = await app.request('http://localhost/api10/abc', {
      headers: { Origin: 'http://other.com' },
    })

    expect(res1.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com')
    expect(res2.headers.get('Access-Control-Allow-Origin')).toBe('http://other.com')
  })

  it('Handle Origin: null with credentials and wildcard', async () => {
    const res = await app.request('http://localhost/api10/abc', {
      headers: { Origin: 'null' },
    })

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('null')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('Options without origin fall back to wildcard default', async () => {
    const subApp = new Hono()
    subApp.use('/api/*', cors({ allowMethods: ['GET', 'POST'] }))
    subApp.get('/api/abc', (c) => c.json({ ok: true }))

    const res = await subApp.request('http://localhost/api/abc')
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')

    const preflight = await subApp.request(
      new Request('http://localhost/api/abc', { method: 'OPTIONS' })
    )
    expect(preflight.headers.get('Access-Control-Allow-Methods')?.split(/\s*,\s*/)).toEqual([
      'GET',
      'POST',
    ])
  })
})
