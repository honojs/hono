import { mergePath, removeIndexString, replaceUrlParam } from './utils'

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
})

describe('removeIndexString', () => {
  it('Should remove last `index` string', () => {
    let url = 'http://localhost/index'
    let newUrl = removeIndexString(url)
    expect(newUrl).toBe('http://localhost/')

    url = '/index'
    newUrl = removeIndexString(url)
    expect(newUrl).toBe('/')
  })
})
