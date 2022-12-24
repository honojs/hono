describe('Example', () => {
  test('GET /', async () => {
    const res = await fetch('http://127.0.0.1:1234')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hono!!')
    expect(res.headers.get('x-powered-by')).toBe('Hono')
    expect(res.headers.get('x-response-time')).toContain('ms')
  })

  test('GET /hello/anything', async () => {
    const res = await fetch('http://127.0.0.1:1234/hello/anything')
    expect(res.status).toBe(404)
    expect(res.headers.get('x-message')).toBe('This is addHeader middleware!')
  })

  test('GET /hello', async () => {
    const res = await fetch('http://127.0.0.1:1234/hello')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('This is /hello')
  })

  test('GET /runtime', async () => {
    const res = await fetch('http://127.0.0.1:1234/runtime')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('lagon')
  })

  test('GET /entry/:id', async () => {
    const res = await fetch('http://127.0.0.1:1234/entry/42')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Your ID is 42')
  })

  describe('/book', () => {
    test('GET /book', async () => {
      const res = await fetch('http://127.0.0.1:1234/book')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('List Books')
    })

    test('GET /book/:id', async () => {
      const res = await fetch('http://127.0.0.1:1234/book/3')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Get Book: 3')
    })

    test('POST /book', async () => {
      const res = await fetch('http://127.0.0.1:1234/book', {
        method: 'POST',
      })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Create Book')
    })
  })

  test('GET /redirect', async () => {
    const res = await fetch('http://127.0.0.1:1234/redirect', {
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
  })

  describe('/basic-auth', () => {
    test('GET /basic-auth/anyroute unauthorized', async () => {
      const res = await fetch('http://127.0.0.1:1234/basic-auth/anyroute')
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
    })

    test('GET /basic-auth/anyroute', async () => {
      const res = await fetch('http://127.0.0.1:1234/basic-auth/anyroute', {
        headers: {
          authorization: `Basic ${btoa('hono:acoolproject')}`,
        },
      })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('You are authorized')
    })
  })

  describe('/bearer-auth', () => {
    test('GET /bearer-auth/anyroute unauthorized', async () => {
      const res = await fetch('http://127.0.0.1:1234/bearer-auth/anyroute')
      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
    })

    test('GET /bearer-auth/anyroute', async () => {
      const res = await fetch('http://127.0.0.1:1234/bearer-auth/anyroute', {
        headers: {
          authorization: 'Bearer secrettoken',
        },
      })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('You are authorized')
    })
  })

  // TODO: enable when Lagon releases the version supporting SHA1 in CryptoSubtle#digest
  test.skip('GET /etag/cached', async () => {
    const res = await fetch('http://127.0.0.1:1234/etag/cached')
    expect(res.status).toBe(200)
    expect(res.headers.get('etag')).toBe('"90ea638841fff3c326fc22cbd156f1146ac0ac02"')
    expect(await res.text()).toBe('Is this cached?')
  })

  test('GET /fetch-url', async () => {
    const res = await fetch('http://127.0.0.1:1234/fetch-url')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('https://example.com/ is 200')
  })

  test('GET /user-agent', async () => {
    const res = await fetch('http://127.0.0.1:1234/user-agent', {
      headers: {
        'user-agent': 'Lagon',
      },
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Your UserAgent is Lagon')
  })

  test('GET /api/posts', async () => {
    const res = await fetch('http://127.0.0.1:1234/api/posts')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([
      { id: 1, title: 'Good Morning' },
      { id: 2, title: 'Good Aternoon' },
      { id: 3, title: 'Good Evening' },
      { id: 4, title: 'Good Night' },
    ])
  })

  test('POST /api/posts', async () => {
    const res = await fetch('http://127.0.0.1:1234/api/posts', {
      method: 'POST',
    })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ message: 'Created!' })
  })

  test('GET /api/default-route', async () => {
    const res = await fetch('http://127.0.0.1:1234/api/default-route')
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('API endpoint is not found')
  })

  describe('/form', () => {
    test('POST /form x-www-form-urlencoded', async () => {
      const res = await fetch('http://127.0.0.1:1234/form', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'username=john&password=Pa%24%24w0rd',
      })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        password: 'Pa$$w0rd',
        username: 'john',
      })
    })

    test('POST /form', async () => {
      const res = await fetch('http://127.0.0.1:1234/form', {
        method: 'POST',
        headers: {
          'content-type':
            'multipart/form-data; boundary=---------------------------9051914041544843365972754266',
        },
        body: `-----------------------------9051914041544843365972754266
Content-Disposition: form-data; name="hello"

world!
-----------------------------9051914041544843365972754266
Content-Disposition: form-data; name="description"

this is another field
-----------------------------9051914041544843365972754266--`,
      })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        description: 'this is another field',
        hello: 'world!',
      })
    })
  })

  test('GET /error', async () => {
    const res = await fetch('http://127.0.0.1:1234/error')
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Custom Error Message')
  })

  test('GET /api/default-route', async () => {
    const res = await fetch('http://127.0.0.1:1234/api/default-route')
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('API endpoint is not found')
  })
})
