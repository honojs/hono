import type { Context } from '../../context'
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
        'X-Request-Id': 'hono-is-hot',
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toBe('hono-is-hot')
    expect(await res.text()).toBe('hono-is-hot')
  })

  it('Should return random request id without using request header', async () => {
    const res = await app.request('http://localhost/requestId', {
      headers: {
        'X-Request-Id': 'Hello!12345-@*^',
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toMatch(regexUUIDv4)
    expect(await res.text()).toMatch(regexUUIDv4)
  })
})

describe('Request ID Middleware with custom generator', () => {
  function generateWord() {
    return 'HonoIsWebFramework'
  }
  function generateDoubleRequestId(c: Context) {
    const honoId = c.req.header('Hono-Request-Id')
    const ohnoId = c.req.header('Ohno-Request-Id')
    if (honoId && ohnoId) {
      return honoId + ohnoId
    }
    return crypto.randomUUID()
  }
  const app = new Hono()
  app.use('/word', requestId({ generator: generateWord }))
  app.use('/doubleRequestId', requestId({ generator: generateDoubleRequestId }))
  app.get('/word', (c) => c.text(c.get('requestId') ?? 'No Request ID'))
  app.get('/doubleRequestId', (c) => c.text(c.get('requestId') ?? 'No Request ID'))
  it('Should return custom request id', async () => {
    const res = await app.request('http://localhost/word')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toBe('HonoIsWebFramework')
    expect(await res.text()).toBe('HonoIsWebFramework')
  })

  it('Should return complex request id', async () => {
    const res = await app.request('http://localhost/doubleRequestId', {
      headers: {
        'Hono-Request-Id': 'Hello',
        'Ohno-Request-Id': 'World',
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toBe('HelloWorld')
    expect(await res.text()).toBe('HelloWorld')
  })
})

describe('Request ID Middleware with limit length', () => {
  const charactersOf255 = 'h'.repeat(255)
  const charactersOf256 = 'h'.repeat(256)

  const app = new Hono()
  app.use('/requestId', requestId())
  app.use('/limit256', requestId({ limitLength: 256 }))
  app.get('/requestId', (c) => c.text(c.get('requestId') ?? 'No Request ID'))
  app.get('/limit256', (c) => c.text(c.get('requestId') ?? 'No Request ID'))

  it('Should return custom request id', async () => {
    const res = await app.request('http://localhost/requestId', {
      headers: {
        'X-Request-Id': charactersOf255,
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toBe(charactersOf255)
    expect(await res.text()).toBe(charactersOf255)
  })
  it('Should return random request id without using request header', async () => {
    const res = await app.request('http://localhost/requestId', {
      headers: {
        'X-Request-Id': charactersOf256,
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toMatch(regexUUIDv4)
    expect(await res.text()).toMatch(regexUUIDv4)
  })
  it('Should return custom request id with 256 characters', async () => {
    const res = await app.request('http://localhost/limit256', {
      headers: {
        'X-Request-Id': charactersOf256,
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toBe(charactersOf256)
    expect(await res.text()).toBe(charactersOf256)
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
        'Hono-Request-Id': 'hono-is-hot',
      },
    })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('Hono-Request-Id')).toBe('hono-is-hot')
    expect(await res.text()).toBe('hono-is-hot')
  })

  it('Should not return request id', async () => {
    const res = await app.request('http://localhost/emptyId')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toBeNull()
    expect(await res.text()).toMatch(regexUUIDv4)
  })
})
