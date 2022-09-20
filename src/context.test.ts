import type { Context } from './context'
import { HonoContext } from './context'

describe('Context', () => {
  const req = new Request('http://localhost/')

  let c: Context
  beforeEach(() => {
    c = new HonoContext(req)
  })

  it('c.text()', async () => {
    const res = c.text('text in c', 201, { 'X-Custom': 'Message' })
    expect(res.status).toBe(201)
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=UTF-8')
    expect(await res.text()).toBe('text in c')
    expect(res.headers.get('X-Custom')).toBe('Message')
  })

  it('c.json()', async () => {
    const res = c.json({ message: 'Hello' }, 201, { 'X-Custom': 'Message' })
    expect(res.status).toBe(201)
    expect(res.headers.get('Content-Type')).toMatch('application/json; charset=UTF-8')
    const text = await res.text()
    expect(text).toBe('{"message":"Hello"}')
    expect(res.headers.get('X-Custom')).toBe('Message')
  })

  it('c.json() with c.pretty(true)', async () => {
    c.pretty(true)
    const res = c.json({ message: 'Hello' })
    const text = await res.text()
    expect(text).toBe(`{
  "message": "Hello"
}`)
  })

  it('c.json() with c.pretty(true, 4)', async () => {
    c.pretty(true, 4)
    const res = c.json({ message: 'Hello' })
    const text = await res.text()
    expect(text).toBe(`{
    "message": "Hello"
}`)
  })

  it('c.html()', async () => {
    const res = c.html('<h1>Hello! Hono!</h1>', 201, { 'X-Custom': 'Message' })
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
    const ctx = new HonoContext(req, {
      API_KEY: key,
    })
    expect(ctx.env.API_KEY).toBe(key)
  })

  it('set and set', async () => {
    const ctx = new HonoContext(req)
    expect(ctx.get('k-foo')).toEqual(undefined)
    ctx.set('k-foo', 'v-foo')
    expect(ctx.get('k-foo')).toEqual('v-foo')
    expect(ctx.get('k-bar')).toEqual(undefined)
    ctx.set('k-bar', { k: 'v' })
    expect(ctx.get('k-bar')).toEqual({ k: 'v' })
  })

  it('has res object by default', async () => {
    c = new HonoContext(req)
    c.res.headers.append('foo', 'bar')
    const res = c.text('foo')
    expect(res.headers.get('foo')).not.toBeNull()
    expect(res.headers.get('foo')).toBe('bar')
  })
})

describe('Context header', () => {
  const req = new Request('http://localhost/')
  let c: Context
  beforeEach(() => {
    c = new HonoContext(req)
  })
  it('Should return only one content-type value', async () => {
    c.header('Content-Type', 'foo')
    c.header('content-type', 'foo')
    const res = c.html('foo')
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
    expect(res.headers.get('content-type')).toBe('text/html; charset=UTF-8')
  })
  it('Should rewrite header values correctly', async () => {
    c.res = c.html('foo')
    const res = c.text('foo')
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=UTF-8')
  })
})
