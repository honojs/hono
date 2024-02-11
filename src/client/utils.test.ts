import { deepMerge, mergePath, removeIndexString, replaceUrlParam } from './utils'

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
})

describe('removeIndexString', () => {
  it('Should remove last `index` string', () => {
    let url = 'http://localhost/index'
    let newUrl = removeIndexString(url)
    expect(newUrl).toBe('http://localhost/')

    url = '/index'
    newUrl = removeIndexString(url)
    expect(newUrl).toBe('/')

    url = '/sub/index'
    newUrl = removeIndexString(url)
    expect(newUrl).toBe('/sub/')

    url = '/subindex'
    newUrl = removeIndexString(url)
    expect(newUrl).toBe('/subindex')
  })
})

describe('deepMerge', () => {
  it('should return the source object if the target object is not an object', () => {
    const target = null
    const source = { a: 1 }
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
