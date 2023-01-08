import {
  splitPath,
  splitRoutingPath,
  getPattern,
  getPathFromURL,
  mergePath,
  getQueryStringFromURL,
  checkOptionalParameter,
} from './url'

describe('url', () => {
  it('splitPath', () => {
    let ps = splitPath('/')
    expect(ps).toStrictEqual([''])

    ps = splitPath('/hello')
    expect(ps).toStrictEqual(['hello'])
  })

  it('splitRoutingPath', () => {
    let ps = splitRoutingPath('/')
    expect(ps).toStrictEqual([''])

    ps = splitRoutingPath('/hello')
    expect(ps).toStrictEqual(['hello'])

    ps = splitRoutingPath('*')
    expect(ps).toStrictEqual(['*'])

    ps = splitRoutingPath('/wildcard-abc/*/wildcard-efg')
    expect(ps).toStrictEqual(['wildcard-abc', '*', 'wildcard-efg'])

    ps = splitRoutingPath('/map/:location/events')
    expect(ps).toStrictEqual(['map', ':location', 'events'])

    ps = splitRoutingPath('/js/:location{[a-z/]+.js}')
    expect(ps).toStrictEqual(['js', ':location{[a-z/]+.js}'])

    ps = splitRoutingPath('/users/:name{[0-9a-zA-Z_-]{3,10}}')
    expect(ps).toStrictEqual(['users', ':name{[0-9a-zA-Z_-]{3,10}}'])

    ps = splitRoutingPath('/users/:@name{[0-9a-zA-Z_-]{3,10}}')
    expect(ps).toStrictEqual(['users', ':@name{[0-9a-zA-Z_-]{3,10}}'])

    ps = splitRoutingPath('/users/:dept{\\d+}/:@name{[0-9a-zA-Z_-]{3,10}}')
    expect(ps).toStrictEqual(['users', ':dept{\\d+}', ':@name{[0-9a-zA-Z_-]{3,10}}'])
  })

  it('getPattern', () => {
    let res = getPattern(':id')
    expect(res).not.toBeNull()
    expect(res?.[0]).toBe(':id')
    expect(res?.[1]).toBe('id')
    expect(res?.[2]).toBe(true)
    res = getPattern(':id{[0-9]+}')
    expect(res?.[0]).toBe(':id{[0-9]+}')
    expect(res?.[1]).toBe('id')
    expect(res?.[2]).toEqual(/^[0-9]+$/)
    res = getPattern('*')
    expect(res).toBe('*')
  })

  describe('getPathFromURL', () => {
    it('getPathFromURL - no trailing slash', () => {
      let path = getPathFromURL('https://example.com/')
      expect(path).toBe('/')
      path = getPathFromURL('https://example.com/hello')
      expect(path).toBe('/hello')
      path = getPathFromURL('https://example.com/hello/hey')
      expect(path).toBe('/hello/hey')
      path = getPathFromURL('https://example.com/hello?name=foo')
      expect(path).toBe('/hello')
      path = getPathFromURL('https://example.com/hello/hey?name=foo&name=bar')
      expect(path).toBe('/hello/hey')
    })

    it('getPathFromURL - with trailing slash', () => {
      let path = getPathFromURL('https://example.com/hello/')
      expect(path).toBe('/hello/')
      path = getPathFromURL('https://example.com/hello/hey/')
      expect(path).toBe('/hello/hey/')
    })

    it('getPathFromURL - no strict is false', () => {
      let path = getPathFromURL('https://example.com/hello/', false)
      expect(path).toBe('/hello')
      path = getPathFromURL('https://example.com/hello/hey/', false)
      expect(path).toBe('/hello/hey')
    })
  })

  describe('getQueryStringFromURL', () => {
    it('should return strings of query params', () => {
      let queryString = getQueryStringFromURL('https://example.com/?foo=bar')
      expect(queryString).toBe('?foo=bar')
      queryString = getQueryStringFromURL('https://example.com/?foo=bar&foo2=bar2')
      expect(queryString).toBe('?foo=bar&foo2=bar2')
      queryString = getQueryStringFromURL('https://example.com/')
      expect(queryString).toBe('')
      // This specification allows the fragments as query strings
      queryString = getQueryStringFromURL('https://example.com/?#foo=#bar&#foo2=#bar2')
      expect(queryString).toBe('?#foo=#bar&#foo2=#bar2')
      // This specification allows that the string includes two `?` or more
      queryString = getQueryStringFromURL('https://example.com/?foo=bar?foo2=bar2')
      expect(queryString).toBe('?foo=bar?foo2=bar2')
    })
  })

  describe('mergePath', () => {
    it('mergePath', () => {
      expect(mergePath('/book', '/')).toBe('/book')
      expect(mergePath('/book/', '/')).toBe('/book/')
      expect(mergePath('/book', '/hey')).toBe('/book/hey')
      expect(mergePath('/book/', '/hey')).toBe('/book/hey')
      expect(mergePath('/book', '/hey/')).toBe('/book/hey/')
      expect(mergePath('/book/', '/hey/')).toBe('/book/hey/')
      expect(mergePath('/book', 'hey', 'say')).toBe('/book/hey/say')
      expect(mergePath('/book', '/hey/', '/say/')).toBe('/book/hey/say/')
      expect(mergePath('/book', '/hey/', '/say/', '/')).toBe('/book/hey/say/')

      expect(mergePath('book', '/')).toBe('/book')
      expect(mergePath('book/', '/')).toBe('/book/')
      expect(mergePath('book', '/hey')).toBe('/book/hey')
      expect(mergePath('book', 'hey')).toBe('/book/hey')
      expect(mergePath('book', 'hey/')).toBe('/book/hey/')
    })
    it('Should be `/book`', () => {
      expect(mergePath('/', 'book')).toBe('/book')
    })
    it('Should be `/book`', () => {
      expect(mergePath('/', '/book')).toBe('/book')
    })
    it('Should be `/`', () => {
      expect(mergePath('/', '/')).toBe('/')
    })
  })

  describe('checkOptionalParameter', () => {
    it('checkOptionalParameter', () => {
      expect(checkOptionalParameter('/api/animals/:type?')).toEqual([
        '/api/animals',
        '/api/animals/:type',
      ])
      expect(checkOptionalParameter('/api/animals/type?')).toBeNull()
      expect(checkOptionalParameter('/api/animals/:type')).toBeNull()
      expect(checkOptionalParameter('/api/animals')).toBeNull()
      expect(checkOptionalParameter('/api/:animals?/type')).toBeNull()
      expect(checkOptionalParameter('/api/animals/:type?/')).toBeNull()
    })
  })
})
