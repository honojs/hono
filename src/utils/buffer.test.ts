import { timingSafeEqual } from '@/utils/buffer'
import { SHA256 as sha256CryptoJS } from 'crypto-js'

describe('buffer', () => {
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
    expect(await timingSafeEqual(true, true, (d: string) => sha256CryptoJS(d).toString()))
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
