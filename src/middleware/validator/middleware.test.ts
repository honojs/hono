import { Hono } from '../../hono'
import { validator } from './index'

describe('Basic - query', () => {
  const app = new Hono()
  // query
  app.get(
    '/foo',
    validator((v) => ({
      page: v.query('page').isRequired().isNumeric(),
      q: v.query('q').isAlpha(),
      q2: v.query('q2').isAlpha().contains('abc'),
      q3: v.query('q3').contains('abc').isAlpha(),
      q4: v.query('q4').contains('abc').isLength(1, 10),
      q5: v.query('q5').isEmpty().isRequired(),
      q6: v.query('q6').contains('abc').isRequired().isLength(5, 100),
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
        'Invalid Value: the query parameter "page" is invalid - undefined',
        'Invalid Value: the query parameter "q5" is invalid - 123',
      ].join('\n')
    )
  })
})

describe('Basic - body', () => {
  const app = new Hono()

  const middleware = validator((v) => ({
    title: v.body('title').isRequired(),
  }))

  app.post('/posts', middleware, (c) => {
    const data = c.req.valid()
    c.header('x-title', data.title)
    return c.text('Valid!')
  })

  it('Should return 200 response - body', async () => {
    const body = new FormData()
    body.append('title', 'This is Title')
    const req = new Request('http://localhost/posts', {
      method: 'POST',
      body: body,
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Valid!')
    expect(res.headers.get('x-title')).toBe('This is Title')
  })

  it('Should return 400 response - body', async () => {
    const body = new FormData()
    const req = new Request('http://localhost/posts', {
      method: 'POST',
      body: body,
    })
    const res = await app.request(req)
    expect(res.status).toBe(400)
    const messages = ['Invalid Value: the request body "title" is invalid - undefined']
    expect(await res.text()).toBe(messages.join('\n'))
  })
})

describe('Basic - header & custom message', () => {
  const app = new Hono()
  // header & custom error message
  app.get(
    '/',
    validator((v) => ({
      xHeader: v.header('x-header').isRequired().message('CUSTOM MESSAGE'),
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
})

describe('Basic - JSON', () => {
  const app = new Hono()
  // JSON
  app.post(
    '/json',
    validator((v) => ({
      name: v.json('post.author.name').isAlpha(),
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
    validator(
      (v) => ({
        userId: v.query('userId').isRequired(),
      }),
      {
        done: (result, c) => {
          if (result.hasError) {
            return c.json({ ERROR: true }, 404)
          }
        },
      }
    ),
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
  app.post(
    '/custom-validator',
    validator((v) => ({
      password: v.body('password').addRule((value) => {
        if (typeof value === 'string') {
          return value.match(/^[a-zA-Z0-9]+$/) ? true : false
        }
        return false
      }),
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
})

describe('Array parameter', () => {
  const app = new Hono()

  // Array parameter
  app.post(
    '/array-parameter',
    validator((v) => ({
      foo: v.body('value').isRequired().isEqual('valid'),
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
    validator((v) => ({
      value: v.body('value').isRequired(),
    })),
    async (c) => {
      const data = c.req.valid()
      return c.text(data.value || '')
    }
  )
  app.post(
    '/json',
    validator((v) => ({
      value: v.json('value').isRequired(),
      foo: v.json('foo').asBoolean().isFalse(),
      bar: v.json('bar').asBoolean().isTrue(),
    })),
    async (c) => {
      const data = c.req.valid()
      return c.text(data.value)
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
      foo: false,
      bar: true,
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
    validator((v, c) => ({
      mail: v.body('mail1').isEqual(c.get('mail2')),
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

describe('Remove additional properties', () => {
  const app = new Hono()
  // query
  app.get(
    '/foo',
    validator((v) => ({
      q: v.query('q').isOptional(),
      page: v.query('page').isNumeric(),
    })),
    (c) => {
      return c.json(c.req.valid())
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
    validator((v) => ({
      name: v.json('post.author.name').isAlpha(),
    })),
    async (c) => {
      return c.json(c.req.valid())
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
    expect(await res.json()).toEqual({ name: 'abcdef' })
  })
})

describe('Structured data', () => {
  const app = new Hono()

  app.post(
    '/post',
    validator((v) => ({
      header: {
        'x-foo': v.header('x-foo').isAlpha(),
      },
      post: {
        title: v.json('post.title').isAlpha(),
        content: v.json('post.content'),
      },
    })),
    (c) => {
      const header = c.req.valid().header
      const post = c.req.valid().post
      return c.json({ header, post })
    }
  )

  it('Should return 200 response', async () => {
    const json = {
      post: {
        title: 'Hello',
        content: 'World',
      },
    }
    const headers = {
      'x-foo': 'bar',
    }
    const req = new Request('http://localhost/post', {
      method: 'POST',
      headers,
      body: JSON.stringify(json),
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ header: headers, post: json.post })
  })

  it('Should return 400 response - missing a required header', async () => {
    const json = {
      post: {
        title: 'Hello',
        content: 'World',
      },
    }
    const req = new Request('http://localhost/post', {
      method: 'POST',
      body: JSON.stringify(json),
    })
    const res = await app.request(req)
    expect(res.status).toBe(400)
  })
})

describe('', () => {
  const app = new Hono()
  app.post(
    '/post',
    validator((v) => ({
      post: {
        title: v.json('post.title').isAlpha(),
        tags: v.json('post.tags').asArray().isRequired(),
        ids: v.json('post.ids').asNumber().asArray(),
      },
    })),
    (c) => {
      const res = c.req.valid()
      return c.json({ tag1: res.post.tags[0] })
    }
  )

  it('Should return 200 response', async () => {
    const json = {
      post: {
        title: 'foo',
        tags: ['Workers', 'Deno', 'Bun'],
        ids: [1, 3, 5],
      },
    }
    const req = new Request('http://localhost/post', {
      method: 'POST',
      body: JSON.stringify(json),
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ tag1: 'Workers' })
  })
})
