import { Hono } from '../../hono'
import { Unit, bodyLimit } from '.'

describe('Body Limit Middleware', () => {
  const app = new Hono()

  const exampleText = 'hono is cool' // 12byte
  const exampleText2 = 'hono is cool and cute' // 21byte

  app.post(
    '/body-limit-15byte',
    bodyLimit({
      maxSize: 15 * Unit.b,
    }),
    (c) => {
      return c.text('yes')
    }
  )

  it('should return 200 response', async () => {
    const res = await app.request('/body-limit-15byte', {
      method: 'POST',
      body: exampleText,
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('yes')
  })

  it('should return 413 response', async () => {
    const res = await app.request('/body-limit-15byte', {
      method: 'POST',
      body: exampleText2,
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(413)
    expect(await res.text()).toBe('413 Request Entity Too Large')
  })

  app.post(
    '/text-limit-15byte-custom',
    bodyLimit({
      maxSize: 15 * Unit.b,
      onError: (c) => {
        return c.text('no', 413)
      },
    }),
    (c) => {
      return c.text('yes')
    }
  )

  it('should return the custom error handler', async () => {
    const res = await app.request('/text-limit-15byte-custom', {
      method: 'POST',
      body: exampleText2,
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(413)
    expect(await res.text()).toBe('no')
  })
})

describe('Unit', () => {
  it('should return the correct size', () => {
    let beforeSize = 1 / 1024

    for (let i = 0, keys = Object.keys(Unit), len = keys.length; i < len; i++) {
      // @ts-expect-error: <safe access>
      const size = Unit[keys[i]]
      expect(size === beforeSize * 1024).toBeTruthy()
      beforeSize = size
    }
  })
})
