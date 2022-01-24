import { Context } from '../src/context'

describe('Context', () => {
  const req = new Request('http://localhost/')
  const c = new Context(req)

  it('c.text', async () => {
    const res = c.text('text in c', 201, { 'X-Custom': 'Message' })
    expect(res.status).toBe(201)
    expect(res.headers.get('Content-Type')).toBe('text/plain')
    expect(await res.text()).toBe('text in c')
    expect(res.headers.get('X-Custom')).toBe('Message')
  })

  it('c.json', async () => {
    const res = c.json({ message: 'Hello' }, 201, { 'X-Custom': 'Message' })
    expect(res.status).toBe(201)
    expect(res.headers.get('Content-Type')).toMatch('application/json')
    const text = await res.text()
    const object = JSON.parse(text)
    expect(object.message).toBe('Hello')
    expect(res.headers.get('X-Custom')).toBe('Message')
  })

  it('c.html', async () => {
    const res = c.html('<h1>Hello! Hono!</h1>', 201, { 'X-Custom': 'Message' })
    expect(res.status).toBe(201)
    expect(res.headers.get('Content-Type')).toMatch('text/html')
    expect(await res.text()).toBe('<h1>Hello! Hono!</h1>')
    expect(res.headers.get('X-Custom')).toBe('Message')
  })

  it('c.redirect', async () => {
    let res = c.redirect('/destination')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toMatch(/^https?:\/\/.+\/destination$/)
    res = c.redirect('https://example.com/destination')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://example.com/destination')
  })

  it('c.header', async () => {
    c.header('X-Foo', 'Bar')
    const res = c.body('Hi')
    const foo = res.headers.get('X-Foo')
    expect(foo).toBe('Bar')
  })

  it('c.status, c.statusText', async () => {
    c.status(201)
    c.statusText('Created!!!!')
    const res = c.body('Hi')
    expect(res.status).toBe(201)
    expect(res.statusText).toBe('Created!!!!')
  })

  it('Complext pattern', async () => {
    c.status(404)
    c.statusText('Hono is Not Found')
    const res = c.json({ hono: 'great app' })
    expect(res.status).toBe(404)
    expect(res.statusText).toBe('Hono is Not Found')
    expect(res.headers.get('Content-Type')).toMatch(/json/)
    const obj: { [key: string]: string } = await res.json()
    expect(obj['hono']).toBe('great app')
  })
})
