import { Hono } from '../../hono'
import { requestId } from '.'

const regexUUIDv4 = /([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})/

describe('Request ID Middleware', () => {
  const app = new Hono()
  app.use('*', requestId())
  app.get('/requestId', (c) => c.text(c.get('requestId') ?? 'No Request ID'))

  it('Should return random request id', async () => {
    const res = await app.request('http://localhost/requestId')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toMatch(regexUUIDv4)
    expect(await res.text()).match(regexUUIDv4)
  })

  it('Should return custom request id', async () => {
    const res = await app.request('http://localhost/requestId', {
      headers: {
        'X-Request-Id': 'hono-is-cool',
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toBe('hono-is-cool')
    expect(await res.text()).toBe('hono-is-cool')
  })

  it('Should return sanitized custom request id', async () => {
    const res = await app.request('http://localhost/requestId', {
      headers: {
        'X-Request-Id': 'Hello!12345-@*^',
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toBe('Hello12345-')
    expect(await res.text()).toBe('Hello12345-')
  })
})

describe('Request ID Middleware with custom generator', () => {
  function generateWord() {
    return 'HonoHonoHono'
  }
  const app = new Hono()
  app.use('*', requestId({ generator: generateWord }))
  app.get('/requestId', (c) => c.text(c.get('requestId') ?? 'No Request ID'))

  it('Should return custom request id', async () => {
    const res = await app.request('http://localhost/requestId')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toBe('HonoHonoHono')
    expect(await res.text()).toBe('HonoHonoHono')
  })
})

describe('Request ID Middleware with custom max length', () => {
  const app = new Hono()
  app.use('/requestId', requestId({ limitLength: 9 }))
  app.use('/zeroId', requestId({ limitLength: 0 }))
  app.get('/requestId', (c) => c.text(c.get('requestId') ?? 'No Request ID'))
  app.get('/zeroId', (c) => c.text(c.get('requestId') ?? 'No Request ID'))

  it('Should return cut custom request id', async () => {
    const res = await app.request('http://localhost/requestId', {
      headers: {
        'X-Request-Id': '12345678910',
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toBe('123456789')
    expect(await res.text()).toBe('123456789')
  })

  it('Should return uncut request id', async () => {
    const characterOf260 = 'h'.repeat(260)
    const res = await app.request('http://localhost/zeroId', {
      headers: {
        'X-Request-Id': characterOf260,
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toBe(characterOf260)
    expect(await res.text()).toBe(characterOf260)
  })
})

describe('Request ID Middleware with custom header', () => {
  const app = new Hono()
  app.use('/requestId', requestId({ headerName: 'Hono-Request-Id' }))
  app.get('/emptyId', requestId({ headerName: '' }))
  app.get('/requestId', (c) => c.text(c.get('requestId') ?? 'No Request ID'))
  app.get('/emptyId', (c) => c.text(c.get('requestId') ?? 'No Request ID'))

  it('Should return custom request id', async () => {
    const res = await app.request('http://localhost/requestId', {
      headers: {
        'Hono-Request-Id': 'hono-is-cool',
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('Hono-Request-Id')).toBe('hono-is-cool')
    expect(await res.text()).toBe('hono-is-cool')
  })

  it('Should not return request id', async () => {
    const res = await app.request('http://localhost/emptyId')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toBeNull()
    expect(await res.text()).toMatch(regexUUIDv4)
  })
})
