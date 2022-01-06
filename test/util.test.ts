import { splitPath, getPattern, getPathFromURL, timingSafeEqual } from '../src/util'

describe('Utility methods', () => {
  it('splitPath', () => {
    let ps = splitPath('/')
    expect(ps[0]).toBe('')
    ps = splitPath('/hello')
    expect(ps[0]).toBe('hello')
    ps = splitPath('*')
    expect(ps[0]).toBe('*')
    ps = splitPath('/wildcard-abc/*/wildcard-efg')
    expect(ps[0]).toBe('wildcard-abc')
    expect(ps[1]).toBe('*')
    expect(ps[2]).toBe('wildcard-efg')
    ps = splitPath('/map/:location/events')
    expect(ps[0]).toBe('map')
    expect(ps[1]).toBe(':location')
    expect(ps[2]).toBe('events')
  })

  it('getPattern', () => {
    let res = getPattern(':id')
    expect(res).not.toBeNull()
    expect(res[0]).toBe('id')
    expect(res[1]).toBe('(.+)')
    res = getPattern(':id{[0-9]+}')
    expect(res[0]).toBe('id')
    expect(res[1]).toBe('([0-9]+)')
  })

  it('getPathFromURL', () => {
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

  describe('timingSafeEqual', () => {
    const crypto = global.crypto
    beforeAll(() => {
      global.crypto = require('crypto').webcrypto
    })
    afterAll(() => {
      global.crypto = crypto
    })

    it('positive', async () => {
      expect(
        await timingSafeEqual(
          '127e6fbfe24a750e72930c220a8e138275656b8e5d8f48a98c3c92df2caba935',
          '127e6fbfe24a750e72930c220a8e138275656b8e5d8f48a98c3c92df2caba935'
        )
      ).toBe(true)
      expect(await timingSafeEqual('a', 'a')).toBe(true)
      expect(await timingSafeEqual('', '')).toBe(true)
      expect(await timingSafeEqual(undefined, undefined)).toBe(true)
      expect(await timingSafeEqual(true, true)).toBe(true)
      expect(await timingSafeEqual(false, false)).toBe(true)
    })

    it('negative', async () => {
      expect(await timingSafeEqual('a', 'b')).toBe(false)
      expect(
        await timingSafeEqual(
          'a',
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        )
      ).toBe(false)
      expect(
        await timingSafeEqual(
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          'a'
        )
      ).toBe(false)
      expect(await timingSafeEqual('alpha', 'beta')).toBe(false)
      expect(await timingSafeEqual(false, true)).toBe(false)
      expect(await timingSafeEqual(false, undefined)).toBe(false)
      expect(
        await timingSafeEqual(
          () => {},
          () => {}
        )
      ).toBe(false)
      expect(await timingSafeEqual({}, {})).toBe(false)
      expect(await timingSafeEqual({ a: 1 }, { a: 1 })).toBe(false)
      expect(await timingSafeEqual({ a: 1 }, { a: 2 })).toBe(false)
      expect(await timingSafeEqual([1, 2], [1, 2])).toBe(false)
      expect(await timingSafeEqual([1, 2], [1, 2, 3])).toBe(false)
    })
  })
})
