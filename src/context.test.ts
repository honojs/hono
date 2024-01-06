import { Context } from './context'
import { HonoRequest } from './request'

describe('Context', () => {
  const req = new HonoRequest(new Request('http://localhost/'))

  let c: Context
  beforeEach(() => {
    c = new Context(req)
  })

  it('c.text()', async () => {
    const res = c.text('text in c', 201, { 'X-Custom': 'Message' })
    expect(res.status).toBe(201)
    expect(res.headers.get('Content-Type')).toMatch(/^text\/plain/)
    expect(await res.text()).toBe('text in c')
    expect(res.headers.get('X-Custom')).toBe('Message')
  })

  it('c.text() with c.status()', async () => {
    c.status(404)
    const res = c.text('not found')
    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Type')).toMatch(/^text\/plain/)
    expect(await res.text()).toBe('not found')
  })

  it('c.json()', async () => {
    const res = c.json({ message: 'Hello' }, 201, { 'X-Custom': 'Message' })
    expect(res.status).toBe(201)
    expect(res.headers.get('Content-Type')).toMatch('application/json; charset=UTF-8')
    const text = await res.text()
    expect(text).toBe('{"message":"Hello"}')
    expect(res.headers.get('X-Custom')).toBe('Message')
  })

  it('c.html()', async () => {
    const res = await c.html('<h1>Hello! Hono!</h1>', 201, { 'X-Custom': 'Message' })
    expect(res.status).toBe(201)
    expect(res.headers.get('Content-Type')).toMatch('text/html')
    expect(await res.text()).toBe('<h1>Hello! Hono!</h1>')
    expect(res.headers.get('X-Custom')).toBe('Message')
  })

  it('c.redirect()', async () => {
    let res = c.redirect('/destination')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/destination')
    res = c.redirect('https://example.com/destination')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://example.com/destination')
  })

  it('c.header()', async () => {
    c.header('X-Foo', 'Bar')
    const res = c.body('Hi')
    const foo = res.headers.get('X-Foo')
    expect(foo).toBe('Bar')
  })

  it('c.header() - append', async () => {
    c.header('X-Foo', 'Bar')
    c.header('X-Foo', 'Buzz', { append: true })
    const res = c.body('Hi')
    const foo = res.headers.get('X-Foo')
    expect(foo).toBe('Bar, Buzz')
  })

  it('c.header() - append, c.html()', async () => {
    c.header('X-Foo', 'Bar', { append: true })
    const res = await c.html('<h1>This rendered fine</h1>')
    expect(res.headers.get('content-type')).toMatch(/^text\/html/)
  })

  it('c.header() - clear the header', async () => {
    c.header('X-Foo', 'Bar')
    c.header('X-Foo', undefined)
    c.header('X-Foo2', 'Bar')
    let res = c.body('Hi')
    expect(res.headers.get('X-Foo')).toBe(null)
    c.header('X-Foo2', undefined)
    res = c.res
    expect(res.headers.get('X-Foo2')).toBe(null)
  })

  it('c.body() - multiple header', async () => {
    const res = c.body('Hi', 200, {
      'X-Foo': ['Bar', 'Buzz'],
    })
    const foo = res.headers.get('X-Foo')
    expect(foo).toBe('Bar, Buzz')
  })

  it('c.status()', async () => {
    c.status(201)
    const res = c.body('Hi')
    expect(res.status).toBe(201)
  })

  it('Complex pattern', async () => {
    c.status(404)
    const res = c.json({ hono: 'great app' })
    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Type')).toMatch('application/json; charset=UTF-8')
    const obj: { [key: string]: string } = await res.json()
    expect(obj['hono']).toBe('great app')
  })

  it('Has headers and status', async () => {
    c.header('x-custom1', 'Message1')
    c.header('x-custom2', 'Message2')
    c.status(200)
    const res = c.newResponse('this is body', 201, {
      'x-custom3': 'Message3',
      'x-custom2': 'Message2-Override',
    })
    expect(res.headers.get('x-Custom1')).toBe('Message1')
    expect(res.headers.get('x-Custom2')).toBe('Message2-Override')
    expect(res.headers.get('x-Custom3')).toBe('Message3')
    expect(res.status).toBe(201)
    expect(await res.text()).toBe('this is body')

    // res is already set.
    c.res = res
    c.header('X-Custom4', 'Message4')
    c.status(202)
    expect(c.res.headers.get('X-Custom4')).toBe('Message4')
    expect(c.res.status).toBe(201)
  })

  it('Should append the previous headers to new Response', () => {
    c.res.headers.set('x-Custom1', 'Message1')
    const res2 = new Response('foo2', {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    res2.headers.set('x-Custom2', 'Message2')
    c.res = res2
    expect(c.res.headers.get('x-Custom1')).toBe('Message1')
    expect(c.res.headers.get('Content-Type')).toBe('application/json')
  })

  it('Should return 200 response', async () => {
    const res = c.text('Text')
    expect(res.status).toBe(200)
  })

  it('Should return 204 response', async () => {
    c.status(204)
    const res = c.body(null)
    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')
  })

  it('Should be able read env', async () => {
    const req = new HonoRequest(new Request('http://localhost/'))
    const key = 'a-secret-key'
    const ctx = new Context(req, {
      env: {
        API_KEY: key,
      },
    })
    expect(ctx.env.API_KEY).toBe(key)
  })

  it('set and set', async () => {
    const ctx = new Context(req)
    expect(ctx.get('k-foo')).toEqual(undefined)
    ctx.set('k-foo', 'v-foo')
    expect(ctx.get('k-foo')).toEqual('v-foo')
    expect(ctx.get('k-bar')).toEqual(undefined)
    ctx.set('k-bar', { k: 'v' })
    expect(ctx.get('k-bar')).toEqual({ k: 'v' })
  })

  it('has res object by default', async () => {
    c = new Context(req)
    c.res.headers.append('foo', 'bar')
    const res = c.text('foo')
    expect(res.headers.get('foo')).not.toBeNull()
    expect(res.headers.get('foo')).toBe('bar')
  })

  // The `c.runtime()` will be removed in v4.
  it('returns current runtime (node)', async () => {
    c = new Context(req)
    expect(c.runtime).toBe('node')
  })
})

describe('Context header', () => {
  const req = new HonoRequest(new Request('http://localhost/'))
  let c: Context
  beforeEach(() => {
    c = new Context(req)
  })
  it('Should return only one content-type value', async () => {
    c.header('Content-Type', 'foo')
    const res = await c.html('foo')
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
  })
  it('Should rewrite header values correctly', async () => {
    c.res = await c.html('foo')
    const res = c.text('foo')
    expect(res.headers.get('Content-Type')).toMatch(/^text\/plain/)
  })

  it('Should set header values if the #this.headers is set and the arg is ResponseInit', async () => {
    c.header('foo', 'bar')
    const res = c.body('foo', {
      headers: {
        'Content-Type': 'text/plain',
      },
    })
    expect(res.headers.get('foo')).toBe('bar')
  })
})

describe('Pass a ResponseInit to respond methods', () => {
  const req = new HonoRequest(new Request('http://localhost/'))
  let c: Context
  beforeEach(() => {
    c = new Context(req)
  })

  it('c.json()', async () => {
    const originalResponse = new Response('Unauthorized', {
      headers: {
        'content-type': 'text/plain',
        'x-custom': 'custom message',
      },
      status: 401,
    })
    const res = c.json(
      {
        message: 'Unauthorized',
      },
      originalResponse
    )
    expect(res.status).toBe(401)
    expect(res.headers.get('content-type')).toMatch(/^application\/json/)
    expect(res.headers.get('x-custom')).toBe('custom message')
    expect(await res.json()).toEqual({
      message: 'Unauthorized',
    })
  })

  it('c.body()', async () => {
    const originalResponse = new Response('<h1>Hello</h1>', {
      headers: {
        'content-type': 'text/html',
      },
    })
    const res = c.body('<h2>Hello</h2>', originalResponse)
    expect(res.headers.get('content-type')).toMatch(/^text\/html/)
    expect(await res.text()).toBe('<h2>Hello</h2>')
  })

  it('c.text()', async () => {
    const originalResponse = new Response(JSON.stringify({ foo: 'bar' }))
    const res = c.text('foo', originalResponse)
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(await res.text()).toBe('foo')
  })

  it('c.html()', async () => {
    const originalResponse = new Response('foo')
    const res = await c.html('<h1>foo</h1>', originalResponse)
    expect(res.headers.get('content-type')).toMatch(/^text\/html/)
    expect(await res.text()).toBe('<h1>foo</h1>')
  })

  it('c.streamText()', async () => {
    const res = c.streamText(async (stream) => {
      for (let i = 0; i < 3; i++) {
        await stream.write(`${i}`)
        await stream.sleep(1)
      }
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('transfer-encoding')).toBe('chunked')

    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    for (let i = 0; i < 3; i++) {
      const { value } = await reader.read()
      expect(decoder.decode(value)).toEqual(`${i}`)
    }
  })

  it('c.stream()', async () => {
    const res = c.stream(async (stream) => {
      for (let i = 0; i < 3; i++) {
        await stream.write(new Uint8Array([i]))
        await stream.sleep(1)
      }
    })
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    for (let i = 0; i < 3; i++) {
      const { value } = await reader.read()
      expect(value).toEqual(new Uint8Array([i]))
    }
  })
})

declare module './context' {
  interface ContextRenderer {
    (content: string | Promise<string>, head: { title: string }): Response | Promise<Response>
  }
}

describe('c.render', () => {
  const req = new HonoRequest(new Request('http://localhost/'))
  let c: Context
  beforeEach(() => {
    c = new Context(req)
  })

  it('Should return a Response from the default renderer', async () => {
    c.header('foo', 'bar')
    const res = await c.render('<h1>content</h1>', { title: 'dummy ' })
    expect(res.headers.get('foo')).toBe('bar')
    expect(await res.text()).toBe('<h1>content</h1>')
  })

  it('Should return a Response from the custom renderer', async () => {
    c.setRenderer((content, head) => {
      return c.html(`<html><head>${head.title}</head><body>${content}</body></html>`)
    })
    c.header('foo', 'bar')
    const res = await c.render('<h1>content</h1>', { title: 'title' })
    expect(res.headers.get('foo')).toBe('bar')
    expect(await res.text()).toBe('<html><head>title</head><body><h1>content</h1></body></html>')
  })

  it('c.stream() - with aborted during writing', async () => {
    let aborted = false
    const res = c.stream(async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      for (let i = 0; i < 3; i++) {
        await stream.write(new Uint8Array([i]))
        await stream.sleep(1)
      }
    })
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    for (let i = 0; i < 2; i++) {
      await reader.read()
      await reader.cancel()
    }
    expect(aborted).toBe(true)
  })
})
