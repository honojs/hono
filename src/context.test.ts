import { Context } from './context'
import { setCookie } from './helper/cookie'

const makeResponseHeaderImmutable = (res: Response) => {
  Object.defineProperty(res, 'headers', {
    value: new Proxy(res.headers, {
      set(target, prop, value) {
        if (prop === 'set') {
          throw new TypeError('Cannot modify headers: Headers are immutable')
        }
        return Reflect.set(target, prop, value)
      },
      get(target, prop) {
        if (prop === 'set') {
          return function () {
            throw new TypeError('Cannot modify headers: Headers are immutable')
          }
        }
        return Reflect.get(target, prop)
      },
    }),
    writable: false,
  })
  return res
}

describe('Context', () => {
  const req = new Request('http://localhost/')

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
    const res: Response = c.html('<h1>Hello! Hono!</h1>', 201, { 'X-Custom': 'Message' })
    expect(res.status).toBe(201)
    expect(res.headers.get('Content-Type')).toMatch('text/html')
    expect(await res.text()).toBe('<h1>Hello! Hono!</h1>')
    expect(res.headers.get('X-Custom')).toBe('Message')
  })

  it('c.html() with async', async () => {
    const resPromise: Promise<Response> = c.html(
      new Promise<string>((resolve) => setTimeout(() => resolve('<h1>Hello! Hono!</h1>'), 0)),
      201,
      {
        'X-Custom': 'Message',
      }
    )
    const res = await resPromise
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

  it('c.redirect() w/ URL', async () => {
    const res = c.redirect(new URL('/destination', 'https://example.com'))
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

  it('c.set() and c.get()', async () => {
    expect(c.get('foo')).toBe(undefined)
    c.set('foo', 'bar')
    expect(c.get('foo')).toBe('bar')
    expect(c.get('foo2')).toBe(undefined)
  })

  it('c.var', async () => {
    expect(c.var.foo).toBe(undefined)
    c.set('foo', 'bar')
    expect(c.var.foo).toBe('bar')
    expect(c.var.foo2).toBe(undefined)
  })

  it('c.notFound()', async () => {
    const res = c.notFound()
    expect(res).instanceOf(Response)
  })

  it('Should set headers if already this.#headers is created by `c.header()`', async () => {
    c.header('X-Foo', 'Bar')
    c.header('X-Foo', 'Buzz', { append: true })
    const res = c.body('Hi', {
      headers: {
        'X-Message': 'Hi',
      },
    })
    expect(res.headers.get('X-Foo')).toBe('Bar, Buzz')
    expect(res.headers.get('X-Message')).toBe('Hi')
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

  it('c.header() - clear the header when append is true', async () => {
    c.header('X-Foo', 'Bar', { append: true })
    c.header('X-Foo', undefined)
    expect(c.res.headers.get('X-Foo')).toBe(null)
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

  it('Inherit current status if not specified', async () => {
    c.status(201)
    const res = c.newResponse('this is body', {
      headers: {
        'x-custom3': 'Message3',
        'x-custom2': 'Message2-Override',
      },
    })
    expect(res.headers.get('x-Custom2')).toBe('Message2-Override')
    expect(res.headers.get('x-Custom3')).toBe('Message3')
    expect(res.status).toBe(201)
    expect(await res.text()).toBe('this is body')
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
    const req = new Request('http://localhost/')
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
})

describe('event and executionCtx', () => {
  const req = new Request('http://localhost/')

  it('Should return the event if accessing c.event', () => {
    const respondWith = vi.fn()
    const c = new Context(req, {
      // @ts-expect-error the type is not correct
      executionCtx: {
        respondWith: respondWith,
      },
    })
    expect(() => c.event).not.toThrowError()
    c.event.respondWith(new Response())
    expect(respondWith).toHaveBeenCalled()
  })

  it('Should throw an error if accessing c.event', () => {
    const c = new Context(req)
    expect(() => c.event).toThrowError()
  })

  it('Should return the executionCtx if accessing c.executionCtx', () => {
    const pathThroughOnException = vi.fn()
    const waitUntil = vi.fn()
    const c = new Context(req, {
      executionCtx: {
        passThroughOnException: pathThroughOnException,
        waitUntil: waitUntil,
      },
      env: {},
    })
    expect(() => c.executionCtx).not.toThrowError()
    c.executionCtx.passThroughOnException()
    expect(pathThroughOnException).toHaveBeenCalled()
    const asyncFunc = async () => {}
    c.executionCtx.waitUntil(asyncFunc())
    expect(waitUntil).toHaveBeenCalled()
  })

  it('Should throw an error if accessing c.executionCtx', () => {
    const c = new Context(req)
    expect(() => c.executionCtx).toThrowError()
  })
})

describe('Context header', () => {
  const req = new Request('http://localhost/')
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

  it('Should set cookie headers when re-assigning Response to `c.res`', () => {
    const cookies = ['foo=bar; Path=/', 'foo2=bar2; Path=/']
    const res = new Response(null)
    res.headers.append('set-cookie', cookies[0])
    res.headers.append('set-cookie', cookies[1])
    c.res = res
    expect(c.res.headers.getSetCookie().length).toBe(2)

    // Re-assign
    const newCookies = ['foo3=bar3; Path=/']
    const newResponse = new Response(null)
    newResponse.headers.append('set-cookie', newCookies[0])
    c.res = newResponse
    expect(c.res.headers.getSetCookie().length).toBe(cookies.length)
    expect(c.res.headers.getSetCookie()).toEqual(cookies)
  })

  it('Should keep previous cookies in response headers', () => {
    c.res.headers.append('set-cookie', 'foo=bar; Path=/')
    setCookie(c, 'foo2', 'bar2', { path: '/' })
    const res = c.json({ message: 'Hello' })
    const cookies = res.headers.getSetCookie()
    expect(cookies.includes('foo=bar; Path=/')).toBe(true)
    expect(cookies.includes('foo2=bar2; Path=/')).toBe(true)
  })

  it('Should set set-cookie header values if c.res is already defined', () => {
    c.res = new Response(null, {
      headers: [
        ['set-cookie', 'a'],
        ['set-cookie', 'b'],
        ['set-cookie', 'c'],
      ],
    })
    const res = c.text('Hi')
    expect(res.headers.get('set-cookie')).toBe('a, b, c')
  })

  it('Should be able to overwrite a fetch response with a new response.', async () => {
    c.res = makeResponseHeaderImmutable(new Response('bar'))
    c.res = new Response('foo', {
      headers: {
        'X-Custom': 'Message',
      },
    })
    expect(c.res.text()).resolves.toBe('foo')
    expect(c.res.headers.get('X-Custom')).toBe('Message')
  })

  it('Should be able to overwrite a response with a fetch response.', async () => {
    c.res = new Response('foo', {
      headers: {
        'X-Custom': 'Message',
      },
    })
    c.res = makeResponseHeaderImmutable(new Response('bar'))
    expect(c.res.text()).resolves.toBe('bar')
    expect(c.res.headers.get('X-Custom')).toBe('Message')
  })
})

describe('Pass a ResponseInit to respond methods', () => {
  const req = new Request('http://localhost/')
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

  it('c.body() should retain context cookies from context and original response', async () => {
    setCookie(c, 'context', '1')
    setCookie(c, 'context', '2')

    const originalResponse = new Response('', {
      headers: {
        'set-cookie': 'response=1; Path=/',
      },
    })
    const res = c.body('', originalResponse)
    const cookies = res.headers.getSetCookie()
    expect(cookies.includes('context=1; Path=/')).toBe(true)
    expect(cookies.includes('context=2; Path=/')).toBe(true)
    expect(cookies.includes('response=1; Path=/')).toBe(true)
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
})

declare module './context' {
  interface ContextRenderer {
    (content: string | Promise<string>, head: { title: string }): Response | Promise<Response>
  }
}

describe('c.render', () => {
  const req = new Request('http://localhost/')
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
})
