import {
  checkOptionalParameter,
  getPath,
  getPathNoStrict,
  getPattern,
  getQueryParam,
  getQueryParams,
  getQueryStrings,
  mergePath,
  splitPath,
  splitRoutingPath,
  encodeNonEncodedURI,
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

  describe('getPattern', () => {
    it('no pattern', () => {
      const res = getPattern('id')
      expect(res).toBeNull()
    })

    it('no pattern with next', () => {
      const res = getPattern('id', 'next')
      expect(res).toBeNull()
    })

    it('default pattern', () => {
      const res = getPattern(':id')
      expect(res).toEqual([':id', 'id', true])
    })

    it('default pattern with next', () => {
      const res = getPattern(':id', 'next')
      expect(res).toEqual([':id', 'id', true])
    })

    it('regex pattern', () => {
      const res = getPattern(':id{[0-9]+}')
      expect(res).toEqual([':id{[0-9]+}', 'id', /^[0-9]+$/])
    })

    it('regex pattern with next', () => {
      const res = getPattern(':id{[0-9]+}', 'next')
      expect(res).toEqual([':id{[0-9]+}#next', 'id', /^[0-9]+(?=\/next)/])
    })

    it('wildcard', () => {
      const res = getPattern('*')
      expect(res).toBe('*')
    })

    it('wildcard with next', () => {
      const res = getPattern('*', 'next')
      expect(res).toBe('*')
    })
  })

  describe('getPath', () => {
    it('getPath - no trailing slash', () => {
      let path = getPath(new Request('https://example.com/'))
      expect(path).toBe('/')
      path = getPath(new Request('https://example.com/hello'))
      expect(path).toBe('/hello')
      path = getPath(new Request('https://example.com/hello/hey'))
      expect(path).toBe('/hello/hey')
      path = getPath(new Request('https://example.com/hello?name=foo'))
      expect(path).toBe('/hello')
      path = getPath(new Request('https://example.com/hello/hey?name=foo&name=bar'))
      expect(path).toBe('/hello/hey')
    })

    it('getPath - with trailing slash', () => {
      let path = getPath(new Request('https://example.com/hello/'))
      expect(path).toBe('/hello/')
      path = getPath(new Request('https://example.com/hello/hey/'))
      expect(path).toBe('/hello/hey/')
    })

    it('getPath - http+unix', () => {
      const path = getPath(new Request('http+unix://%2Ftmp%2Fsocket%2Esock/hello/'))
      expect(path).toBe('/hello/')
    })
  })

  describe('getQueryStrings', () => {
    it('getQueryStrings', () => {
      let qs = getQueryStrings('https://example.com/hello?name=foo&name=bar&age=20')
      expect(qs).toBe('?name=foo&name=bar&age=20')
      qs = getQueryStrings('https://example.com/hello?')
      expect(qs).toBe('?')
      qs = getQueryStrings('https://example.com/hello')
      expect(qs).toBe('')
      // Allows to contain hash
      qs = getQueryStrings('https://example.com/hello?name=foo&name=bar&age=20#hash')
      expect(qs).toBe('?name=foo&name=bar&age=20#hash')
    })
  })

  describe('getPathNoStrict', () => {
    it('getPathNoStrict - no strict is false', () => {
      let path = getPathNoStrict(new Request('https://example.com/hello/'))
      expect(path).toBe('/hello')
      path = getPathNoStrict(new Request('https://example.com/hello/hey/'))
      expect(path).toBe('/hello/hey')
    })

    it('getPathNoStrict - return `/` even if strict is false', () => {
      const path = getPathNoStrict(new Request('https://example.com/'))
      expect(path).toBe('/')
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
      expect(mergePath('/book', '/hey', '/say', '/')).toBe('/book/hey/say')
      expect(mergePath('/', '/book', '/hey', '/say', '/')).toBe('/book/hey/say')

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
      expect(checkOptionalParameter('/v1/leaderboard/:version?/:platform?')).toEqual([
        '/v1/leaderboard',
        '/v1/leaderboard/:version',
        '/v1/leaderboard/:version/:platform',
      ])
      expect(checkOptionalParameter('/api/:version/animal/:type?')).toEqual([
        '/api/:version/animal',
        '/api/:version/animal/:type',
      ])
    })
  })

  describe('getQueryParam', () => {
    it('Parse URL query strings', () => {
      expect(getQueryParam('http://example.com/?name=hey', 'name')).toBe('hey')
      expect(getQueryParam('http://example.com/?name=hey#fragment', 'name')).toBe('hey#fragment')
      expect(getQueryParam('http://example.com/?name=hey&age=20&tall=170', 'age')).toBe('20')
      expect(getQueryParam('http://example.com/?Hono+is=a+web+framework', 'Hono is')).toBe(
        'a web framework'
      )
      expect(getQueryParam('http://example.com/?name=%E0%A4%A', 'name')).toBe('%E0%A4%A')

      expect(getQueryParam('http://example.com/?name0=sam&name1=tom', 'name0')).toBe('sam')
      expect(getQueryParam('http://example.com/?name0=sam&name1=tom', 'name1')).toBe('tom')
      expect(getQueryParam('http://example.com/?name0=sam&name1=tom', 'name')).toBe(undefined)

      let searchParams = new URLSearchParams({ name: '炎' })
      expect(getQueryParam(`http://example.com/?${searchParams.toString()}`, 'name')).toBe('炎')
      searchParams = new URLSearchParams({ '炎 is': 'a web framework' })
      expect(
        getQueryParam(
          `http://example.com/?${searchParams.toString()}`,
          searchParams.keys().next().value
        )
      ).toBe('a web framework')
      expect(getQueryParam('http://example.com/?name=hey&age=20&tall=170', 'weight')).toBe(
        undefined
      )
      expect(getQueryParam('http://example.com/?name=hey&age=20&tall=170')).toEqual({
        name: 'hey',
        age: '20',
        tall: '170',
      })
      expect(getQueryParam('http://example.com/?pretty&&&&q=1%2b1=2')).toEqual({
        pretty: '',
        q: '1+1=2',
      })
      expect(getQueryParam('http://example.com/?pretty', 'pretty')).toBe('')
      expect(getQueryParam('http://example.com/?pretty', 'prtt')).toBe(undefined)
      expect(getQueryParam('http://example.com/?name=sam&name=tom', 'name')).toBe('sam')
      expect(getQueryParam('http://example.com/?name=sam&name=tom')).toEqual({
        name: 'sam',
      })
      searchParams = new URLSearchParams('?name=sam=tom')
      expect(getQueryParam('name', searchParams.get('name')?.toString()))
    })
  })

  describe('getQueryParams', () => {
    it('Parse URL query strings', () => {
      expect(getQueryParams('http://example.com/?name=hey', 'name')).toEqual(['hey'])
      expect(getQueryParams('http://example.com/?name=hey#fragment', 'name')).toEqual([
        'hey#fragment',
      ])
      expect(getQueryParams('http://example.com/?name=hey&name=foo', 'name')).toEqual([
        'hey',
        'foo',
      ])
      expect(getQueryParams('http://example.com/?name=hey&age=20&tall=170', 'age')).toEqual(['20'])
      expect(
        getQueryParams('http://example.com/?name=hey&age=20&tall=170&name=foo&age=30', 'age')
      ).toEqual(['20', '30'])
      expect(getQueryParams('http://example.com/?Hono+is=a+web+framework', 'Hono is')).toEqual([
        'a web framework',
      ])
      expect(getQueryParams('http://example.com/?name=%E0%A4%A', 'name')).toEqual(['%E0%A4%A'])

      let searchParams = new URLSearchParams()
      searchParams.append('tag', '炎')
      searchParams.append('tag', 'ほのお')
      expect(getQueryParams(`http://example.com/?${searchParams.toString()}`, 'tag')).toEqual([
        '炎',
        'ほのお',
      ])
      searchParams = new URLSearchParams()
      searchParams.append('炎 works on', 'Cloudflare Workers')
      searchParams.append('炎 works on', 'Fastly Compute')
      expect(
        getQueryParams(
          `http://example.com/?${searchParams.toString()}`,
          searchParams.keys().next().value
        )
      ).toEqual(['Cloudflare Workers', 'Fastly Compute'])
      expect(getQueryParams('http://example.com/?name=hey&age=20&tall=170', 'weight')).toEqual(
        undefined
      )
      expect(
        getQueryParams('http://example.com/?name=hey&age=20&tall=170&name=foo&age=30&tall=180')
      ).toEqual({
        name: ['hey', 'foo'],
        age: ['20', '30'],
        tall: ['170', '180'],
      })
      expect(getQueryParams('http://example.com/?pretty&&&&q=1%2b1=2&q=2%2b2=4')).toEqual({
        pretty: [''],
        q: ['1+1=2', '2+2=4'],
      })
      expect(getQueryParams('http://example.com/?pretty', 'pretty')).toEqual([''])
      expect(getQueryParams('http://example.com/?pretty', 'prtt')).toBe(undefined)
      expect(getQueryParams('http://example.com/?toString')).toEqual({
        toString: [''],
      })
    })
  })

  /**
   * Reference https://github.com/pillarjs/encodeurl
   */
  describe('encodeNonEncodedURI', () => {
    describe('encodeNonEncodedURI(url)', function () {
      describe('when url contains only allowed characters', function () {
        it('should keep URL the same', function () {
          assert.strictEqual(
            encodeNonEncodedURI('http://localhost/foo/bar.html?fizz=buzz#readme'),
            'http://localhost/foo/bar.html?fizz=buzz#readme'
          )
        })

        it('should not touch IPv6 notation', function () {
          assert.strictEqual(
            encodeNonEncodedURI('http://[::1]:8080/foo/bar'),
            'http://[::1]:8080/foo/bar'
          )
        })

        it('should not touch backslashes', function () {
          assert.strictEqual(
            encodeNonEncodedURI('http:\\\\localhost\\foo\\bar.html'),
            'http:\\\\localhost\\foo\\bar.html'
          )
        })
      })

      describe('when url contains invalid raw characters', function () {
        it('should encode LF', function () {
          assert.strictEqual(
            encodeNonEncodedURI('http://localhost/\nsnow.html'),
            'http://localhost/%0Asnow.html'
          )
        })

        it('should encode FF', function () {
          assert.strictEqual(
            encodeNonEncodedURI('http://localhost/\fsnow.html'),
            'http://localhost/%0Csnow.html'
          )
        })

        it('should encode CR', function () {
          assert.strictEqual(
            encodeNonEncodedURI('http://localhost/\rsnow.html'),
            'http://localhost/%0Dsnow.html'
          )
        })

        it('should encode SP', function () {
          assert.strictEqual(
            encodeNonEncodedURI('http://localhost/ snow.html'),
            'http://localhost/%20snow.html'
          )
        })

        it('should encode NULL', function () {
          assert.strictEqual(
            encodeNonEncodedURI('http://localhost/\0snow.html'),
            'http://localhost/%00snow.html'
          )
        })

        it('should encode all expected characters from ASCII set', function () {
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f'
            ),
            '/%00%01%02%03%04%05%06%07%08%09%0A%0B%0C%0D%0E%0F'
          )
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f'
            ),
            '/%10%11%12%13%14%15%16%17%18%19%1A%1B%1C%1D%1E%1F'
          )
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\x20\x21\x22\x23\x24\x25\x26\x27\x28\x29\x2a\x2b\x2c\x2d\x2e\x2f'
            ),
            "/%20!%22#$%25&'()*+,-./"
          )
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\x30\x31\x32\x33\x34\x35\x36\x37\x38\x39\x3a\x3b\x3c\x3d\x3e\x3f'
            ),
            '/0123456789:;%3C=%3E?'
          )
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\x40\x41\x42\x43\x44\x45\x46\x47\x48\x49\x4a\x4b\x4c\x4d\x4e\x4f'
            ),
            '/@ABCDEFGHIJKLMNO'
          )
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\x50\x51\x52\x53\x54\x55\x56\x57\x58\x59\x5a\x5b\x5c\x5d\x5e\x5f'
            ),
            '/PQRSTUVWXYZ[\\]^_'
          )
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\x60\x61\x62\x63\x64\x65\x66\x67\x68\x69\x6a\x6b\x6c\x6d\x6e\x6f'
            ),
            '/%60abcdefghijklmno'
          )
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\x70\x71\x72\x73\x74\x75\x76\x77\x78\x79\x7a\x7b\x7c\x7d\x7e\x7f'
            ),
            '/pqrstuvwxyz%7B|%7D~%7F'
          )
        })

        it('should encode all characters above ASCII as UTF-8 sequences', function () {
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8a\x8b\x8c\x8d\x8e\x8f'
            ),
            '/%C2%80%C2%81%C2%82%C2%83%C2%84%C2%85%C2%86%C2%87%C2%88%C2%89%C2%8A%C2%8B%C2%8C%C2%8D%C2%8E%C2%8F'
          )
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9a\x9b\x9c\x9d\x9e\x9f'
            ),
            '/%C2%90%C2%91%C2%92%C2%93%C2%94%C2%95%C2%96%C2%97%C2%98%C2%99%C2%9A%C2%9B%C2%9C%C2%9D%C2%9E%C2%9F'
          )
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\xa0\xa1\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xab\xac\xad\xae\xaf'
            ),
            '/%C2%A0%C2%A1%C2%A2%C2%A3%C2%A4%C2%A5%C2%A6%C2%A7%C2%A8%C2%A9%C2%AA%C2%AB%C2%AC%C2%AD%C2%AE%C2%AF'
          )
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\xb0\xb1\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xbb\xbc\xbd\xbe\xbf'
            ),
            '/%C2%B0%C2%B1%C2%B2%C2%B3%C2%B4%C2%B5%C2%B6%C2%B7%C2%B8%C2%B9%C2%BA%C2%BB%C2%BC%C2%BD%C2%BE%C2%BF'
          )
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\xc0\xc1\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xcb\xcc\xcd\xce\xcf'
            ),
            '/%C3%80%C3%81%C3%82%C3%83%C3%84%C3%85%C3%86%C3%87%C3%88%C3%89%C3%8A%C3%8B%C3%8C%C3%8D%C3%8E%C3%8F'
          )
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\xd0\xd1\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xdb\xdc\xdd\xde\xdf'
            ),
            '/%C3%90%C3%91%C3%92%C3%93%C3%94%C3%95%C3%96%C3%97%C3%98%C3%99%C3%9A%C3%9B%C3%9C%C3%9D%C3%9E%C3%9F'
          )
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\xe0\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xeb\xec\xed\xee\xef'
            ),
            '/%C3%A0%C3%A1%C3%A2%C3%A3%C3%A4%C3%A5%C3%A6%C3%A7%C3%A8%C3%A9%C3%AA%C3%AB%C3%AC%C3%AD%C3%AE%C3%AF'
          )
          assert.strictEqual(
            encodeNonEncodedURI(
              '/\xf0\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xfb\xfc\xfd\xfe\xff'
            ),
            '/%C3%B0%C3%B1%C3%B2%C3%B3%C3%B4%C3%B5%C3%B6%C3%B7%C3%B8%C3%B9%C3%BA%C3%BB%C3%BC%C3%BD%C3%BE%C3%BF'
          )
        })
      })

      describe('when url contains percent-encoded sequences', function () {
        it('should not encode the "%" character', function () {
          assert.strictEqual(
            encodeNonEncodedURI('http://localhost/%20snow.html'),
            'http://localhost/%20snow.html'
          )
        })

        it('should not care if sequence is valid UTF-8', function () {
          assert.strictEqual(
            encodeNonEncodedURI('http://localhost/%F0snow.html'),
            'http://localhost/%F0snow.html'
          )
        })

        it('should encode the "%" if not a valid sequence', function () {
          assert.strictEqual(
            encodeNonEncodedURI('http://localhost/%foo%bar%zap%'),
            'http://localhost/%25foo%bar%25zap%25'
          )
        })
      })

      describe('when url contains raw surrogate pairs', function () {
        it('should encode pair as UTF-8 byte sequences', function () {
          assert.strictEqual(
            encodeNonEncodedURI('http://localhost/\uD83D\uDC7B snow.html'),
            'http://localhost/%F0%9F%91%BB%20snow.html'
          )
        })

        describe('when unpaired', function () {
          it('should encode as replacement character', function () {
            assert.strictEqual(
              encodeNonEncodedURI('http://localhost/\uD83Dfoo\uDC7B <\uDC7B\uD83D>.html'),
              'http://localhost/%EF%BF%BDfoo%EF%BF%BD%20%3C%EF%BF%BD%EF%BF%BD%3E.html'
            )
          })

          it('should encode at end of string', function () {
            assert.strictEqual(
              encodeNonEncodedURI('http://localhost/\uD83D'),
              'http://localhost/%EF%BF%BD'
            )
          })

          it('should encode at start of string', function () {
            assert.strictEqual(encodeNonEncodedURI('\uDC7Bfoo'), '%EF%BF%BDfoo')
          })
        })
      })
    })
  })
})
