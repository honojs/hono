import { splitPath, getPattern, getPathFromURL, isAbsoluteURL, mergePath } from './url'

describe('url', () => {
  it('splitPath', () => {
    let ps = splitPath('/')
    expect(ps).toStrictEqual([''])

    ps = splitPath('/hello')
    expect(ps).toStrictEqual(['hello'])

    ps = splitPath('*')
    expect(ps).toStrictEqual(['*'])

    ps = splitPath('/wildcard-abc/*/wildcard-efg')
    expect(ps).toStrictEqual(['wildcard-abc', '*', 'wildcard-efg'])

    ps = splitPath('/map/:location/events')
    expect(ps).toStrictEqual(['map', ':location', 'events'])
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
      path = getPathFromURL('https://example.com/hello/hey#fragment')
      expect(path).toBe('/hello/hey')
    })

    it('getPathFromURL - with trailing slash', () => {
      let path = getPathFromURL('https://example.com/hello/')
      expect(path).toBe('/hello/')
      path = getPathFromURL('https://example.com/hello/hey/')
      expect(path).toBe('/hello/hey/')
    })

    it('getPathFromURL - no strict is false', () => {
      let path = getPathFromURL('https://example.com/hello/', { strict: false })
      expect(path).toBe('/hello')
      path = getPathFromURL('https://example.com/hello/hey/', { strict: false })
      expect(path).toBe('/hello/hey')
    })
  })

  describe('isAbsoluteURL', () => {
    it('absolute url', () => {
      expect(isAbsoluteURL('https://example.com')).toBeTruthy()
      expect(isAbsoluteURL('https://example.com/xxx')).toBeTruthy()
    })
    it('relative url', () => {
      expect(isAbsoluteURL('/')).not.toBeTruthy()
      expect(isAbsoluteURL('/location')).not.toBeTruthy()
      expect(isAbsoluteURL('')).not.toBeTruthy()
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
})
