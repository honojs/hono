import { Hono } from '../../hono'
import { Unit, bodyLimit } from '.'

describe('bodyLimit by Middleware', () => {
  const app = new Hono()

  const exampleBody = 'hono is cool' // 12byte
  const exampleText = 'hono is cool' // 12byte
  const exampleText2 = 'hono is cool and cute' // 21byte
  const exampleJSON = {
    hono: 'is cool and fast',
  } // 27byte
  const exampleJSON2 = {
    hono: 'is cool and fast',
    cool: 'is hono',
  } // 44byte
  const exampleForm = new FormData()
  exampleForm.append('hono', 'is cool')
  // 100 byte to 200 byte
  const exampleForm2 = new FormData()
  exampleForm2.append('hono', 'is cool')
  exampleForm2.append('hono', 'is cute')
  exampleForm2.append('hono', 'is fast')
  // 300 byte to 400 byte

  app.post(
    '/body-limit-15byte',
    bodyLimit({
      maxSize: 15 * Unit.b,
    }),
    (c) => {
      return c.text('yes')
    }
  )

  it('body limit pass tests', async () => {
    const res = await app.request('/body-limit-15byte', {
      method: 'POST',
      body: exampleText,
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('yes')
  })

  it('body limit fail tests', async () => {
    const res = await app.request('/body-limit-15byte', {
      method: 'POST',
      body: exampleText2,
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(413)
    expect(await res.text()).toBe('413 Request Entity Too Large')
  })

  app.post(
    '/text-limit-15byte',
    bodyLimit({
      type: 'text',
      maxSize: 15 * Unit.b,
    }),
    (c) => {
      return c.text('yes')
    }
  )

  it('text limit pass tests', async () => {
    const res = await app.request('/text-limit-15byte', {
      method: 'POST',
      body: exampleText,
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('yes')
  })

  it('text limit fail tests', async () => {
    const res = await app.request('/text-limit-15byte', {
      method: 'POST',
      body: exampleText2,
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(413)
    expect(await res.text()).toBe('413 Request Entity Too Large')
  })

  app.post(
    '/json-limit-35byte',
    bodyLimit({
      type: 'json',
      maxSize: 35 * Unit.b,
    }),
    (c) => {
      return c.text('yes')
    }
  )

  it('json limit pass tests', async () => {
    const res = await app.request('/json-limit-35byte', {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json, text/plain',
      }),
      body: JSON.stringify(exampleJSON),
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('yes')
  })

  it('json limit fail tests with empty', async () => {
    const res = await app.request('/json-limit-35byte', {
      method: 'POST',
      headers: new Headers({
        'Content-Type': ' ' + 'application/json, text/plain',
      }),
      body: JSON.stringify(exampleJSON2),
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(413)
    expect(await res.text()).toBe('413 Request Entity Too Large')
  })

  app.post(
    '/form-limit-300byte',
    bodyLimit({
      type: 'form',
      maxSize: 300 * Unit.b,
    }),
    (c) => {
      return c.text('yes')
    }
  )

  it('form limit pass tests', async () => {
    const res = await app.request('/form-limit-300byte', {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      body: exampleForm,
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('yes')
  })

  it('form limit fail tests', async () => {
    const res = await app.request('/form-limit-300byte', {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      body: exampleForm2,
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(413)
    expect(await res.text()).toBe('413 Request Entity Too Large')
  })

  app.post(
    '/text-limit-15byte-custom',
    bodyLimit({
      type: 'text',
      maxSize: 15 * Unit.b,
      handler: (c) => {
        return c.text('no', 413)
      },
    }),
    (c) => {
      return c.text('yes')
    }
  )

  it('text limit with custom handler', async () => {
    const res = await app.request('/text-limit-15byte-custom', {
      method: 'POST',
      body: exampleText2,
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(413)
    expect(await res.text()).toBe('no')
  })

  app.post(
    '/json-limit-35byte-custom',
    bodyLimit({
      type: 'json',
      maxSize: 35 * Unit.b,
      handler: (c) => {
        return c.text('no', 413)
      },
    }),
    (c) => {
      return c.text('yes')
    }
  )

  it('json limit with custom handler with lower case', async () => {
    const res = await app.request('/json-limit-35byte-custom', {
      method: 'POST',
      headers: new Headers({
        'content-type': 'application/json, text/plain',
      }),
      body: JSON.stringify(exampleJSON2),
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(413)
    expect(await res.text()).toBe('no')
  })

  app.post(
    '/enum-limit-custom',
    bodyLimit([
      {
        type: 'json',
        maxSize: 35 * Unit.b,
        handler: (c) => {
          return c.text('no', 413)
        },
      },
      {
        type: 'text',
        maxSize: 35 * Unit.b,
        handler: (c) => {
          return c.text('no', 413)
        },
      },
    ]),
    (c) => {
      return c.text('yes')
    }
  )

  it('enum limit pass tests', async () => {
    const res = await app.request('/enum-limit-custom', {
      method: 'POST',
      body: exampleText,
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('yes')
  })

  it('enum limit with custom handler with lower case', async () => {
    const res = await app.request('/enum-limit-custom', {
      method: 'POST',
      headers: new Headers({
        'content-type': 'application/json, text/plain',
      }),
      body: JSON.stringify(exampleJSON2),
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(413)
    expect(await res.text()).toBe('no')
  })

  it('enum limit with custom handler', async () => {
    const res = await app.request('/enum-limit-custom', {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json, text/plain',
      }),
      body: JSON.stringify(exampleJSON2),
    })

    expect(res).not.toBeNull()
    expect(res.status).toBe(413)
    expect(await res.text()).toBe('no')
  })

  it('Unit test', () => {
    let beforeSize = 1 / 1024

    for (let i = 0, keys = Object.keys(Unit), len = keys.length; i < len; i++) {
      // @ts-expect-error: <safe access>
      const size = Unit[keys[i]]
      expect(size === beforeSize * 1024).toBeTruthy()
      beforeSize = size
    }
  })
})
