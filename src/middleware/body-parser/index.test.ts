import { Hono } from '../../hono'
import { Uint, bodyParser } from '.'

describe('bodyParse works', () => {
  const app = new Hono()

  app.post(
    '/max-64mb/body',
    bodyParser({
      type: 'body',
      limit: 64 * Uint.mb,
    }),
    (c) => {
      return c.json({
        size: c.var.body<Blob>().size,
        type: c.var.body<Blob>().type,
      })
    }
  )

  it('Should return same body on POST', async () => {
    const data = {
      hono: 'is',
    }
    const res = await app.request(
      new Request('https://localhost/max-64mb/body', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    )

    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      size: 13,
      type: 'text/plain;charset=utf-8',
    })
  })

  app.post(
    '/max-64mb/json',
    bodyParser({
      type: 'json',
      limit: 64 * Uint.mb,
    }),
    (c) => {
      return c.json(c.var.body())
    }
  )

  it('Should return same json on POST', async () => {
    const data = {
      hono: 'is',
    }
    const res = await app.request(
      new Request('https://localhost/max-64mb/json', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    )
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(data)
  })

  app.post(
    '/max-64mb/json-error',
    bodyParser({
      type: 'json',
      limit: 64 * Uint.mb,
    }),
    (c) => {
      return c.json(c.var.body())
    }
  )

  it('Should return json-error on POST', async () => {
    const data = `{
      hono: 'is',
    }cool`

    const res = await app.request(
      new Request('https://localhost/max-64mb/json-error', {
        method: 'POST',
        body: data,
      })
    )

    expect(res).not.toBeNull()
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Internal Server Error')
  })

  app.post(
    '/max-64mb/text',
    bodyParser({
      type: 'text',
      limit: 64 * Uint.mb,
    }),
    (c) => {
      return c.text(c.var.body<string>())
    }
  )

  it('Should return same text on POST', async () => {
    const data = 'hono is cool'
    const res = await app.request(
      new Request('https://localhost/max-64mb/text', {
        method: 'POST',
        body: data,
      })
    )
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hono is cool')
  })

  app.post(
    '/max-64mb/form',
    bodyParser({
      type: 'form',
      limit: 64 * Uint.mb,
    }),
    (c) => {
      return c.text(c.var.body<FormData>().toString())
    }
  )

  it('Should return same formData on POST', async () => {
    const data = new FormData()
    const res = await app.request(
      new Request('https://localhost/max-64mb/form', {
        method: 'POST',
        body: data,
      })
    )
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('[object FormData]')
  })

  app.use(
    '/max-32bit/*',
    bodyParser({
      type: 'body',
    })
  )

  app.all('/max-32bit', (c) => c.text('hono is cool'))

  it('Should return hono is cool on GET', async () => {
    const res = await app.request(
      new Request('https://localhost/max-32bit', {
        method: 'POST',
        body: JSON.stringify({
          hono: 'is',
        }),
      })
    )
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hono is cool')
  })

  it('Should return hono is cool on POST', async () => {
    const res = await app.request(
      new Request('https://localhost/max-32bit', {
        method: 'POST',
        body: JSON.stringify({
          hono: 'is',
        }),
      })
    )
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hono is cool')
  })

  it('Should return hono is cool on PUT', async () => {
    const res = await app.request(
      new Request('https://localhost/max-32bit', {
        method: 'PUT',
        body: JSON.stringify({
          hono: 'is',
        }),
      })
    )
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hono is cool')
  })

  it('Should return hono is cool on PATCH', async () => {
    const res = await app.request(
      new Request('https://localhost/max-32bit', {
        method: 'PATCH',
        body: JSON.stringify({
          hono: 'is',
        }),
      })
    )
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hono is cool')
  })

  app.use(
    '/max-8byte',
    bodyParser({
      type: 'text',
      limit: 8 * Uint.b,
    })
  )

  app.post('/max-8byte', (c) => c.text('hono is cool'))

  it('Should return 413 Request Entity Too Large on POST', async () => {
    const res = await app.request(
      new Request('https://localhost/max-8byte', {
        method: 'POST',
        body: JSON.stringify({
          hono: 'is',
        }),
      })
    )
    expect(res).not.toBeNull()
    expect(res.status).toBe(413)
    expect(await res.text()).toBe('413 Request Entity Too Large')
  })

  it('Should return hono is cool on POST', async () => {
    const res = await app.request(
      new Request('https://localhost/max-8byte', {
        method: 'POST',
        body: 'hono',
      })
    )
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hono is cool')
  })

  app.use(
    '/max-8byte-custom',
    bodyParser({
      type: 'text',
      limit: 8 * Uint.b,
      handler: (c) => {
        return c.text('not cool', 413)
      },
    })
  )

  app.post('/max-8byte-custom', (c) => c.text('hono is cool'))

  it('Should return not cool with 413 on POST', async () => {
    const res = await app.request(
      new Request('https://localhost/max-8byte-custom', {
        method: 'POST',
        body: JSON.stringify({
          hono: 'is',
        }),
      })
    )
    expect(res).not.toBeNull()
    expect(res.status).toBe(413)
    expect(await res.text()).toBe('not cool')
  })

  it('Should return hono is cool on POST', async () => {
    const res = await app.request(
      new Request('https://localhost/max-8byte-custom', {
        method: 'POST',
        body: 'hono',
      })
    )
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hono is cool')
  })
})
