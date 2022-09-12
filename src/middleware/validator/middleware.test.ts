import { Hono } from '../../hono'
import { validation } from './index'

describe('Basic', () => {
  const app = new Hono()
  // query
  app.get(
    '/foo',
    validation((v) => ({
      query: {
        page: [v.required, v.isNumeric],
        q: v.isAlpha,
        q2: [v.isAlpha, [v.contains, 'abc']],
        q3: [[v.contains, 'abc'], v.isAlpha],
        q4: [
          [v.contains, 'abc'],
          [v.isLength, 1, 10],
        ],
        q5: [v.isEmpty, v.required],
        q6: [[v.contains, 'abc'], v.required, [v.isLength, 5, 100]],
      },
    })),
    (c) => {
      return c.text('Valid')
    }
  )

  it('Should return 400 response - query', async () => {
    const searchParams = new URLSearchParams({
      q: 'foobar',
      q2: 'abcdef',
      q3: 'abcdef',
      q4: 'abcde',
      q5: '123',
      q6: 'abcdef',
    })
    const req = new Request(`http://localhost/foo?${searchParams.toString()}`)
    const res = await app.request(req)
    expect(res.status).toBe(400)
    expect(await res.text()).toBe(
      [
        'Invalid Value: the query parameter "page" is invalid - required',
        'Invalid Value: the query parameter "q5" is invalid - isEmpty',
      ].join('\n')
    )
  })

  // body
  app.post(
    '/bar',
    validation((v) => ({
      body: {
        num: [v.trim, v.isNumeric],
      },
    })),
    (c) => {
      return c.text('Valid')
    }
  )

  it('Should return 200 response - body', async () => {
    const formData = new FormData()
    formData.append('num', '1234 ')
    const req = new Request('http://localhost/bar', {
      method: 'POST',
      body: formData,
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
  })

  // header & custom error message
  app.get(
    '/',
    validation((v, message) => ({
      header: {
        'x-header': [v.required, message('CUSTOM MESSAGE')],
      },
    })),
    (c) => {
      return c.text('Valid')
    }
  )

  it('Should return 400 response - header & custom error message', async () => {
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('CUSTOM MESSAGE')
  })

  // JSON
  app.post(
    '/json',
    validation((v) => ({
      json: {
        'post.author.name': v.isAlpha,
      },
    })),
    (c) => {
      return c.text('Valid')
    }
  )

  it('Should return 200 response - JSON', async () => {
    const json = {
      post: {
        author: {
          name: 'abcdef',
        },
      },
    }
    const req = new Request('http://localhost/json', {
      method: 'POST',
      body: JSON.stringify(json),
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
  })
})

describe('Custom Error Handling', () => {
  const app = new Hono()

  // Custom Error handling
  app.get(
    '/custom-error',
    // Custom Error handler should be above.
    validation((v) => ({
      query: {
        userId: v.required,
      },
      done: (result, c) => {
        if (result.hasError) {
          return c.json({ ERROR: true }, 404)
        }
      },
    })),
    (c) => {
      c.header('x-valid', 'OK')
      return c.text('Valid')
    }
  )

  it('Should return 404 response - custom error handling', async () => {
    const res = await app.request('http://localhost/custom-error')
    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Type')).toBe('application/json; charset=UTF-8')
    expect(await res.text()).toEqual(JSON.stringify({ ERROR: true }))
    expect(res.headers.get('x-valid')).toBeFalsy()
  })
})

describe('Custom Validation', () => {
  const app = new Hono()

  // Custom Validator
  const passwordValidator = (value: string) => {
    return value.match(/^[a-zA-Z0-9]+$/) ? true : false
  }
  app.post(
    '/custom-validator',
    validation((_, message) => ({
      body: {
        password: [passwordValidator, message('password is wrong')],
      },
    })),
    (c) => {
      return c.text('Valid')
    }
  )

  it('Should return 200 response - custom validator', async () => {
    const formData = new FormData()
    formData.append('password', 'abcd123')
    const req = new Request('http://localhost/custom-validator', {
      method: 'POST',
      body: formData,
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
  })

  it('Should return 400 response - custom validator', async () => {
    const formData = new FormData()
    formData.append('password', 'abcd_+123$')
    const req = new Request('http://localhost/custom-validator', {
      method: 'POST',
      body: formData,
    })
    const res = await app.request(req)
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('password is wrong')
  })
})

describe('Array parameter', () => {
  const app = new Hono()

  // Array parameter
  app.post(
    '/array-parameter',
    validation((v) => ({
      body: {
        value: [v.required, [v.equals, 'valid']],
      },
    })),
    (c) => {
      return c.text('Valid')
    }
  )

  it('Should return 200 response - array parameter', async () => {
    const formData = new FormData()
    formData.append('value', 'valid')
    const req = new Request('http://localhost/array-parameter', {
      method: 'POST',
      body: formData,
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Valid')
  })

  it('Should return 400 response - array parameter', async () => {
    const formData = new FormData()
    formData.append('value', 'invalid')
    const req = new Request('http://localhost/array-parameter', {
      method: 'POST',
      body: formData,
    })
    const res = await app.request(req)
    expect(res.status).toBe(400)
  })
})

describe('Clone Request object if validate JSON or body', () => {
  const app = new Hono()

  app.post(
    '/body',
    validation((v) => ({
      body: {
        value: v.required,
      },
    })),
    async (c) => {
      const data = await c.req.parseBody()
      return c.text((data['value'] as string) || '')
    }
  )
  app.post(
    '/json',
    validation((v) => ({
      json: {
        value: v.required,
      },
    })),
    async (c) => {
      const json = (await c.req.json()) as { value: string }
      return c.text(json.value)
    }
  )

  it('Should return 200 response - clone body/body', async () => {
    const formData = new FormData()
    formData.append('value', 'foo')
    const req = new Request('http://localhost/body', {
      method: 'POST',
      body: formData,
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('foo')
  })

  it('Should return 200 response - clone body/JSON', async () => {
    const json = {
      value: 'foo',
    }
    const req = new Request('http://localhost/json', {
      method: 'POST',
      body: JSON.stringify(json),
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('foo')
  })
})

describe('Check duplicate values', () => {
  const app = new Hono()
  app.post(
    '/bar',
    async (c, next) => {
      const data = await c.req.parseBody()
      // Use `c.set`/`c.get`
      c.set('mail2', data['mail2'])
      await next()
    },
    validation((v, _, c) => ({
      body: {
        mail1: [v.equals, c.get('mail2')],
      },
    })),
    (c) => {
      return c.text('Valid')
    }
  )

  it('Should return 200 response - duplicate values', async () => {
    const formData = new FormData()
    formData.append('mail1', 'foo@honojs.dev')
    formData.append('mail2', 'foo@honojs.dev')
    const req = new Request('http://localhost/bar', {
      method: 'POST',
      body: formData,
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
  })
})

describe('JSON object should not be stringified', () => {
  const app = new Hono()

  // JSON
  app.post(
    '/json',
    validation((v) => ({
      json: {
        'post.author.email': v.required,
      },
    })),
    (c) => {
      return c.text('Valid')
    }
  )

  it('Should return 400 response - JSON', async () => {
    const json = {}
    const req = new Request('http://localhost/json', {
      method: 'POST',
      body: JSON.stringify(json),
    })
    const res = await app.request(req)
    expect(res.status).toBe(400)
  })
})

describe('Remove additional properties', () => {
  const app = new Hono()
  // query
  app.get(
    '/foo',
    validation((v) => ({
      query: {
        q: v.optional,
        page: v.isNumeric,
      },
    })),
    (c) => {
      return c.json(c.req.query())
    }
  )

  it('Should only return validated params', async () => {
    const searchParams = new URLSearchParams({
      q: 'foobar',
      page: '3',
      foo: 'additional query',
    })
    const req = new Request(`http://localhost/foo?${searchParams.toString()}`)
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ q: 'foobar', page: '3' })
  })

  // JSON
  app.post(
    '/json',
    validation((v) => ({
      json: {
        'post.author.name': v.isAlpha,
      },
    })),
    async (c) => {
      return c.json(await c.req.json())
    }
  )

  it('Should only return validated JSON data', async () => {
    const json = {
      post: {
        title: 'Hello',
        author: {
          name: 'abcdef',
          age: 20,
        },
      },
    }
    const req = new Request('http://localhost/json', {
      method: 'POST',
      body: JSON.stringify(json),
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ post: { author: { name: 'abcdef' } } })
  })

  // `removeAdditional` option is false
  app.get(
    '/with-additional',
    validation((v) => ({
      query: {
        q: v.optional,
        page: v.isNumeric,
      },
      removeAdditional: false,
    })),
    (c) => {
      return c.json(c.req.query())
    }
  )

  it('Should only return validated params', async () => {
    const searchParams = new URLSearchParams({
      q: 'foobar',
      page: '3',
      foo: 'additional query',
    })
    const req = new Request(`http://localhost/with-additional?${searchParams.toString()}`)
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ q: 'foobar', page: '3', foo: 'additional query' })
  })
})
