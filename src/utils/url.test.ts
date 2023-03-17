import {
  splitPath,
  splitRoutingPath,
  getPattern,
  getPathFromURL,
  mergePath,
  getQueryStringFromURL,
  checkOptionalParameter,
  getQueryParam,
  getQueryParams,
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
      expect(queryString).toBe('foo=bar')
      queryString = getQueryStringFromURL('https://example.com/?foo=bar&foo2=bar2')
      expect(queryString).toBe('foo=bar&foo2=bar2')
      queryString = getQueryStringFromURL('https://example.com/')
      expect(queryString).toBe('')
      // This specification allows the fragments as query strings
      queryString = getQueryStringFromURL('https://example.com/?#foo=#bar&#foo2=#bar2')
      expect(queryString).toBe('#foo=#bar&#foo2=#bar2')
      // This specification allows that the string includes two `?` or more
      queryString = getQueryStringFromURL('https://example.com/?foo=bar?foo2=bar2')
      expect(queryString).toBe('foo=bar?foo2=bar2')
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
      expect(checkOptionalParameter('/:optional?')).toEqual(['/', '/:optional'])
    })
  })

  describe('getQueryParam', () => {
    it('Parse URL query strings', () => {
      expect(getQueryParam('name=hey', 'name')).toBe('hey')
      expect(getQueryParam('name=hey#', 'name')).toBe('hey#')
      expect(getQueryParam('name=hey&age=20&tall=170', 'age')).toBe('20')
      let searchParams = new URLSearchParams({ name: '炎' })
      expect(getQueryParam(searchParams.toString(), 'name')).toBe('炎')
      expect(getQueryParam('name=hey&age=20&tall=170', 'weight')).toBe(null)
      expect(getQueryParam('name=hey&age=20&tall=170')).toEqual({
        name: 'hey',
        age: '20',
        tall: '170',
      })
      expect(getQueryParam('pretty', 'pretty')).toBe('')
      expect(getQueryParam('pretty', 'prtt')).toBe(null)
      expect(getQueryParam('name=sam&name=tom', 'name')).toBe('sam')
      expect(getQueryParam('name=sam&name=tom')).toEqual({
        name: 'sam',
      })
      searchParams = new URLSearchParams('?name=sam=tom')
      expect(getQueryParam('name', searchParams.get('name')?.toString()))
    })
  })

  describe('getQueryParams', () => {
    it('Parse URL query strings', () => {
      expect(getQueryParams('name=hey', 'name')).toEqual(['hey'])
      expect(getQueryParams('name=hey#', 'name')).toEqual(['hey#'])
      expect(getQueryParams('name=hey&name=foo', 'name')).toEqual(['hey', 'foo'])
      expect(getQueryParams('name=hey&age=20&tall=170', 'age')).toEqual(['20'])
      expect(getQueryParams('name=hey&age=20&tall=170&name=foo&age=30', 'age')).toEqual([
        '20',
        '30',
      ])
      const searchParams = new URLSearchParams()
      searchParams.append('tag', '炎')
      searchParams.append('tag', 'ほのお')
      expect(getQueryParams(searchParams.toString(), 'tag')).toEqual(['炎', 'ほのお'])
      expect(getQueryParams('name=hey&age=20&tall=170', 'weight')).toEqual(null)
      expect(getQueryParams('name=hey&age=20&tall=170&name=foo&age=30&tall=180')).toEqual({
        name: ['hey', 'foo'],
        age: ['20', '30'],
        tall: ['170', '180'],
      })
      expect(getQueryParams('pretty', 'pretty')).toEqual([''])
      expect(getQueryParams('pretty', 'prtt')).toBe(null)
    })
  })
})
