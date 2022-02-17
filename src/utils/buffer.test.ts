import { timingSafeEqual, sha256, decodeBase64 } from './buffer'

describe('buffer', () => {
  const crypto = global.crypto
  beforeAll(() => {
    global.crypto = require('crypto').webcrypto
  })
  afterAll(() => {
    global.crypto = crypto
  })

  it('decodeBaes64', async () => {
    expect(await decodeBase64('aG9vb29vb29vbw==')).toBe('hooooooooo')
    expect(await decodeBase64('54KO')).toBe('炎')

    expect(await decodeBase64('abcdedf')).not.toBe('abcdef')
  })

  it('sha256', async () => {
    expect(await sha256('hono')).toBe(
      '8b3dc17add91b7e8f0b5109a389927d66001139cd9b03fa7b95f83126e1b2b23'
    )
    expect(await sha256('炎')).toBe(
      '1fddc5a562ee1fbeb4fc6def7d4be4911fcdae4273b02ae3a507b170ba0ea169'
    )

    expect(await sha256('abcdedf')).not.toBe('abcdef')
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
      await timingSafeEqual('a', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    ).toBe(false)
    expect(
      await timingSafeEqual('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'a')
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
