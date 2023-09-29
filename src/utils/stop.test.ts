import { Hono } from '../hono'
import { Stop, Resume } from './stop'

describe('Server Stop Method', () => {
  const app = new Hono()

  app.get('/', async () => {
    Stop(app, 2000) // stop in 2s

    return new Response('Hello world!', {
      status: 200,
      statusText: 'ok',
    })
  })

  it('Is the server down as expected', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(res.statusText).toBe('ok')
    expect(await res.text()).toBe('Hello world!')

    const res2 = await app.request('/')
    expect(res2.status).toBe(503) // stopped

    setTimeout(async () => {
      const res3 = await app.request('/')
      expect(res3.status).toBe(200)
    }, 2000)
  })
})

describe('Server Resume Method', () => {
  const app = new Hono()

  app.get('/', async () => {
    Stop(app, -1) // semipermanent stop

    Resume(app, 3000) // resume after 3s

    return new Response('Hello world!', {
      status: 200,
      statusText: 'ok',
    })
  })

  it('Is the server up as expected', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(res.statusText).toBe('ok')
    expect(await res.text()).toBe('Hello world!')

    const res2 = await app.request('/')
    expect(res2.status).toBe(503) // stopped

    setTimeout(async () => {
      const res3 = await app.request('/')
      expect(res3.status).toBe(200)
    }, 3000)
  })
})