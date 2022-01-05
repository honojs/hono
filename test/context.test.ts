import makeServiceWorkerEnv from 'service-worker-mock'
import { Context } from '../src/context'

declare var global: any
Object.assign(global, makeServiceWorkerEnv())

describe('Context', () => {
  const req = new Request('/')
  const c = new Context(req, new Response())

  it('c.text', async () => {
    let res = c.text('text in c')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('text in c')
  })

  it('c.json', async () => {
    let res = c.json({ message: 'Hello' })
    expect(res.status).toBe(200)
    const text = await res.text()
    const object = JSON.parse(text)
    expect(object.message).toBe('Hello')
  })
})
