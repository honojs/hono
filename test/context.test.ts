import makeServiceWorkerEnv from 'service-worker-mock'
import { Context } from '../src/context'

// eslint-disable-next-line
declare let global: any
Object.assign(global, makeServiceWorkerEnv())

describe('Context', () => {
  const req = new Request('/')
  const c = new Context(req, new Response())

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
})
