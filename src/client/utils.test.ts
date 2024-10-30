import {
  buildSearchParams,
  deepMerge,
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
