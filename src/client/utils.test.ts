import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { Hono } from '../hono'
import type { Expect, Equal } from '../utils/types'
import { hc } from './client'
import {
  buildSearchParams,
  deepMerge,
  parseResponse,
  mergePath,
  removeIndexString,
  replaceUrlParam,
  replaceUrlProtocol,
} from './utils'

describe('mergePath', () => {
  it('Should merge paths correctly', () => {
    expect(mergePath('http://localhost', '/api')).toBe('http://localhost/api')
    expect(mergePath('http://localhost/', '/api')).toBe('http://localhost/api')
    expect(mergePath('http://localhost', 'api')).toBe('http://localhost/api')
    expect(mergePath('http://localhost/', 'api')).toBe('http://localhost/api')
    expect(mergePath('http://localhost/', '/')).toBe('http://localhost/')
  })
})

describe('replaceUrlParams', () => {
  it('Should replace correctly', () => {
    const url = 'http://localhost/posts/:postId/comments/:commentId'
    const params = {
      postId: '123',
      commentId: '456',
    }
    const replacedUrl = replaceUrlParam(url, params)
    expect(replacedUrl).toBe('http://localhost/posts/123/comments/456')
  })

  it('Should replace correctly when there is regex pattern', () => {
    const url = 'http://localhost/posts/:postId{[abc]+}/comments/:commentId{[0-9]+}'
    const params = {
      postId: 'abc',
      commentId: '456',
    }
    const replacedUrl = replaceUrlParam(url, params)
    expect(replacedUrl).toBe('http://localhost/posts/abc/comments/456')
  })

  it('Should replace correctly when there is regex pattern with length limit', () => {
    const url = 'http://localhost/year/:year{[1-9]{1}[0-9]{3}}/month/:month{[0-9]{2}}'
    const params = {
      year: '2024',
      month: '2',
    }
    const replacedUrl = replaceUrlParam(url, params)
    expect(replacedUrl).toBe('http://localhost/year/2024/month/2')
  })

  it('Should replace correctly when it has optional parameters', () => {
    const url = 'http://localhost/something/:firstId/:secondId/:version?'
    const params = {
      firstId: '123',
      secondId: '456',
      version: undefined,
    }
    const replacedUrl = replaceUrlParam(url, params)
    expect(replacedUrl).toBe('http://localhost/something/123/456')
  })
})

describe('buildSearchParams', () => {
  it('Should build URLSearchParams correctly', () => {
    const query = {
      id: '123',
      type: 'test',
      tag: ['a', 'b'],
    }
    const searchParams = buildSearchParams(query)
    expect(searchParams.toString()).toBe('id=123&type=test&tag=a&tag=b')
  })
})

describe('replaceUrlProtocol', () => {
  it('Should replace http to ws', () => {
    const url = 'http://localhost'
    const newUrl = replaceUrlProtocol(url, 'ws')
    expect(newUrl).toBe('ws://localhost')
  })

  it('Should replace https to wss', () => {
    const url = 'https://localhost'
    const newUrl = replaceUrlProtocol(url, 'ws')
    expect(newUrl).toBe('wss://localhost')
  })

  it('Should replace ws to http', () => {
    const url = 'ws://localhost'
    const newUrl = replaceUrlProtocol(url, 'http')
    expect(newUrl).toBe('http://localhost')
  })

  it('Should replace wss to https', () => {
    const url = 'wss://localhost'
    const newUrl = replaceUrlProtocol(url, 'http')
    expect(newUrl).toBe('https://localhost')
  })
})

describe('removeIndexString', () => {
  it('Should remove last `/index` string', () => {
    let url = 'http://localhost/index'
    let newUrl = removeIndexString(url)
    expect(newUrl).toBe('http://localhost/')

    url = '/index'
    newUrl = removeIndexString(url)
    expect(newUrl).toBe('')

    url = '/sub/index'
    newUrl = removeIndexString(url)
    expect(newUrl).toBe('/sub')

    url = '/subindex'
    newUrl = removeIndexString(url)
    expect(newUrl).toBe('/subindex')
  })

  it('Should remove `/index` with query parameters', () => {
    let url = 'http://localhost/index?page=123&limit=20'
    let newUrl = removeIndexString(url)
    expect(newUrl).toBe('http://localhost/?page=123&limit=20')

    url = 'https://example.com/index?q=search'
    newUrl = removeIndexString(url)
    expect(newUrl).toBe('https://example.com/?q=search')

    url = '/api/index?filter=test'
    newUrl = removeIndexString(url)
    expect(newUrl).toBe('/api?filter=test')

    url = '/index?a=1&b=2&c=3'
    newUrl = removeIndexString(url)
    expect(newUrl).toBe('?a=1&b=2&c=3')
  })
})

describe('deepMerge', () => {
  it('should return the source object if the target object is not an object', () => {
    const target = null
    const source = 'not an object' as unknown as Record<string, unknown>
    const result = deepMerge(target, source)
    expect(result).toEqual(source)
  })

  it('should merge two objects with object properties', () => {
    expect(
      deepMerge(
        { headers: { hono: '1' }, timeout: 2, params: {} },
        { headers: { hono: '2', demo: 2 }, params: undefined }
      )
    ).toStrictEqual({
      params: undefined,
      headers: { hono: '2', demo: 2 },
      timeout: 2,
    })
  })
})

describe('parseResponse', async () => {
  const app = new Hono()
    .get('/text', (c) => c.text('hi'))
    .get('/json', (c) => c.json({ message: 'hi' }))
    .get('/might-error-json', (c) => {
      if (Math.random() > 0.5) {
        return c.json({ error: 'error' }, 500)
      }
      return c.json({ data: [{ id: 1 }, { id: 2 }] })
    })
    .get('/might-error-mixed-json-text', (c) => {
      if (Math.random() > 0.5) {
        return c.text('500 Internal Server Error', 500)
      }
      return c.json({ message: 'Success' })
    })
    .get('/200-explicit', (c) => c.text('OK', 200))
    .get('/404', (c) => c.text('404 Not Found', 404))
    .get('/500', (c) => c.text('500 Internal Server Error', 500))
    .get('/raw', (c) => {
      c.header('content-type', '')
      return c.body('hello')
    })
    .get('/rawUnknown', (c) => {
      c.header('content-type', 'x/custom-type')
      return c.body('hello')
    })
    .get('/rawBuffer', (c) => {
      c.header('content-type', 'x/custom-type')
      return c.body(new TextEncoder().encode('hono'))
    })

  const client = hc<typeof app>('http://localhost')

  const server = setupServer(
    http.get('http://localhost/text', () => {
      return HttpResponse.text('hi')
    }),
    http.get('http://localhost/json', () => {
      return HttpResponse.json({ message: 'hi' })
    }),
    http.get('http://localhost/might-error-json', () => {
      if (Math.random() > 0.5) {
        return HttpResponse.json({ error: 'error' }, { status: 500 })
      }
      return HttpResponse.json({ data: [{ id: 1 }, { id: 2 }] })
    }),
    http.get('http://localhost/might-error-mixed-json-text', () => {
      if (Math.random() > 0.5) {
        return HttpResponse.text('500 Internal Server Error', { status: 500 })
      }
      return HttpResponse.json({ message: 'Success' })
    }),
    http.get('http://localhost/200-explicit', () => {
      return HttpResponse.text('OK', { status: 200 })
    }),
    http.get('http://localhost/404', () => {
      return HttpResponse.text('404 Not Found', { status: 404 })
    }),
    http.get('http://localhost/500', () => {
      return HttpResponse.text('500 Internal Server Error', { status: 500 })
    }),
    http.get('http://localhost/raw', () => {
      return HttpResponse.text('hello', {
        headers: {
          'content-type': '',
        },
      })
    }),
    http.get('http://localhost/rawUnknown', () => {
      return HttpResponse.text('hello', {
        headers: {
          'content-type': 'x/custom-type',
        },
      })
    }),
    http.get('http://localhost/rawBuffer', () => {
      return HttpResponse.arrayBuffer(new TextEncoder().encode('hono').buffer, {
        headers: {
          'content-type': 'x/custom-type',
        },
      })
    })
  )

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  await Promise.all([
    it('should auto parse the text response - async fetch', async () => {
      const result = await parseResponse(client.text.$get())
      expect(result).toBe('hi')
      type _verify = Expect<Equal<typeof result, 'hi'>>
    }),
    it('should auto parse the text response - sync fetch', async () => {
      const result = await parseResponse(await client.text.$get())
      expect(result).toBe('hi')
      type _verify = Expect<Equal<typeof result, 'hi'>>
    }),
    it('should auto parse text response - explicit 200', async () => {
      const result = await parseResponse(client['200-explicit'].$get())
      expect(result).toBe('OK')
      type _verify = Expect<Equal<typeof result, 'OK'>>
    }),
    it('should auto parse the json response - async fetch', async () => {
      const result = await parseResponse(client.json.$get())
      expect(result).toEqual({ message: 'hi' })
      type _verify = Expect<Equal<typeof result, { message: string }>>
    }),
    it('should auto parse the json response - sync fetch', async () => {
      const result = await parseResponse(await client.json.$get())
      expect(result).toEqual({ message: 'hi' })
      type _verify = Expect<Equal<typeof result, { message: string }>>
    }),
    it('should throw error when the response is not ok', async () => {
      await expect(parseResponse(client['404'].$get())).rejects.toThrowError('404 Not Found')
    }),
    it('should parse as text for raw responses without content-type header', async () => {
      const result = await parseResponse(client.raw.$get())
      expect(result).toBe('hello')
      type _verify = Expect<Equal<typeof result, 'hello'>>
    }),
    it('should parse as unknown string for raw buffer responses with unknown content-type header', async () => {
      const result = await parseResponse(client.rawBuffer.$get())
      expect(result).toMatchInlineSnapshot('"hono"')
      type _verify = Expect<Equal<typeof result, string>>
    }),
    it('should throw error matching snapshots', async () => {
      // Defined 404 route
      await expect(parseResponse(client['404'].$get())).rejects.toThrowErrorMatchingInlineSnapshot(
        '[DetailedError: 404 Not Found]'
      )

      // Defined 500 route
      await expect(parseResponse(client['500'].$get())).rejects.toThrowErrorMatchingInlineSnapshot(
        '[DetailedError: 500 Internal Server Error]'
      )

      // Not defined route
      // Note: the error in this test case is thrown at the `fetch` call (.$get()), not during the `parseResponse` call, so I think `parseResponse` should not try to catch and wrap it into a structured error, which could be inconsistent, if the user awaited the fetch.
      await expect(
        // @ts-expect-error noRoute is not defined
        parseResponse(client['noRoute'].$get())
      ).rejects.toThrowErrorMatchingInlineSnapshot('[TypeError: fetch failed]')
    }),
    it('(type-only) should bypass error responses in the result type inference - simple 404', async () => {
      type ResultType = Awaited<
        ReturnType<typeof parseResponse<Awaited<ReturnType<(typeof client)['404']['$get']>>>>
      >
      type _verify = Expect<Equal<Awaited<ResultType>, undefined>>
    }),
    it('(type-only) should bypass error responses in the result type inference - conditional - json', async () => {
      type ResultType = Awaited<
        ReturnType<
          typeof parseResponse<Awaited<ReturnType<(typeof client)['might-error-json']['$get']>>>
        >
      >
      type _verify = Expect<Equal<ResultType, { data: { id: number }[] }>>
    }),
    it('(type-only) should bypass error responses in the result type inference - conditional - mixed json/text', async () => {
      type ResultType = Awaited<
        ReturnType<
          typeof parseResponse<
            Awaited<ReturnType<(typeof client)['might-error-mixed-json-text']['$get']>>
          >
        >
      >
      type _verify = Expect<Equal<ResultType, { message: string }>>
    }),
  ])

  it('should parse json response with _bodyInit when body is undefined', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      body: undefined,
      _bodyInit: '{"message":"test"}',
      json: async () => ({ message: 'test' }),
    })

    global.fetch = mockFetch

    const mockClientResponse = {
      $get: mockFetch,
    }

    const result = await parseResponse(mockClientResponse.$get())
    expect(result).toEqual({ message: 'test' })
  })
})
