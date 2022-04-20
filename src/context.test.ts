import { Context } from '@/context'

describe('Context', () => {
  const req = new Request('http://localhost/')

  let c: Context
  beforeEach(() => {
    c = new Context(req)
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
    expect(res.headers.get('Location')).toMatch(/^https?:\/\/.+\/destination$/)
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

  it('c.status() and c.statusText()', async () => {
    c.status(201)
    const res = c.body('Hi')
    expect(res.status).toBe(201)
    expect(res.statusText).toBe('Created')
  })

  it('Complex pattern', async () => {
    c.status(404)
    const res = c.json({ hono: 'great app' })
    expect(res.status).toBe(404)
    expect(res.statusText).toBe('Not Found')
    expect(res.headers.get('Content-Type')).toMatch('application/json; charset=UTF-8')
    const obj: { [key: string]: string } = await res.json()
    expect(obj['hono']).toBe('great app')
  })

  it('Should return `Content-Length`', async () => {
    let res = c.text('abcdefg')
    expect(res.headers.get('Content-Length')).toBe('7')
    res = c.text('炎')
    expect(res.headers.get('Content-Length')).toBe('3')
  })

  it('Has headers, status, and statusText', async () => {
    c.header('X-Custom1', 'Message1')
    c.header('X-Custom2', 'Message2')
    c.status(200)
    const res = c.newResponse('this is body', {
      status: 201,
      headers: {
        'X-Custom3': 'Message3',
        'X-Custom2': 'Message2-Override',
      },
    })
    expect(res.headers.get('X-Custom1')).toBe('Message1')
    expect(res.headers.get('X-Custom2')).toBe('Message2-Override')
    expect(res.headers.get('X-Custom3')).toBe('Message3')
    expect(res.status).toBe(201)
    expect(await res.text()).toBe('this is body')

    // res is already set.
    c.res = res
    c.header('X-Custom4', 'Message4')
    c.status(202)
    expect(c.res.headers.get('X-Custom4')).toBe('Message4')
    expect(c.res.status).toBe(201)
    expect(c.res.statusText).toBe('OK')
  })

  it('Should return 200 response', async () => {
    const res = c.text('Text')
    expect(res.status).toBe(200)
    expect(res.statusText).toBe('OK')
  })
})
