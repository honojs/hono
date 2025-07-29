import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { Hono } from '../hono'
import type { Expect, Equal } from '../utils/types'
import { hc } from './client'
import {
  buildSearchParams,
  deepMerge,
  hcParse,
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

describe('hcParse', async () => {
  const app = new Hono()
    .get('/text', (c) => c.text('hi'))
    .get('/json', (c) => c.json({ message: 'hi' }))
    .get('/404', (c) => c.notFound())
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
    http.get('http://localhost/404', () => {
      return HttpResponse.text('404 Not Found', { status: 404 })
    }),
    http.get('http://localhost', () => {
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
      return HttpResponse.text('hono', {
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
      const result = await hcParse(client.text.$get())
      expect(result).toBe('hi')
      type _verify = Expect<Equal<typeof result, 'hi'>>
    }),
    it('should auto parse the text response - sync fetch', async () => {
      const result = await hcParse(await client.text.$get())
      expect(result).toBe('hi')
      type _verify = Expect<Equal<typeof result, 'hi'>>
    }),
    it('should auto parse the json response - async fetch', async () => {
      const result = await hcParse(client.json.$get())
      expect(result).toEqual({ message: 'hi' })
      type _verify = Expect<Equal<typeof result, { message: string }>>
    }),
    it('should auto parse the json response - sync fetch', async () => {
      const result = await hcParse(await client.json.$get())
      expect(result).toEqual({ message: 'hi' })
      type _verify = Expect<Equal<typeof result, { message: string }>>
    }),
    it('should throw error when the response is not ok', async () => {
      await expect(hcParse(client['404'].$get())).rejects.toThrowError('404 Not Found')
    }),
    it('should parse as text for raw responses without content-type header', async () => {
      const result = await hcParse(client.raw.$get())
      expect(result).toBe('hello')
      type _verify = Expect<Equal<typeof result, 'hello'>>
    }),
    it('should parse as unknown string for raw buffer responses with unknown content-type header', async () => {
      const result = await hcParse(client.rawBuffer.$get())
      expect(result).toMatchInlineSnapshot('"hono"')
      type _verify = Expect<Equal<typeof result, string>>
    }),
  ])
})
