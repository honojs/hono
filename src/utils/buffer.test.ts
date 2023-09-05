import { SHA256 as sha256CryptoJS } from 'crypto-js'
import { timingSafeEqual, bufferToString, bufferToFormData } from './buffer'

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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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

describe('bufferToString', () => {
  it('Should return あいうえお', () => {
    const bytes = [227, 129, 130, 227, 129, 132, 227, 129, 134, 227, 129, 136, 227, 129, 138]
    const buffer = Uint8Array.from(bytes).buffer
    expect(bufferToString(buffer)).toBe('あいうえお')
  })
})

describe('bufferToFormData', () => {
  it('Should parse multipart/form-data from ArrayBuffer', () => {
    const encoder = new TextEncoder()
    const testData =
      '--sampleboundary\r\nContent-Disposition: form-data; name="test"\r\n\r\nHello\r\n--sampleboundary--'
    const arrayBuffer = encoder.encode(testData).buffer

    const result = bufferToFormData(arrayBuffer, 'multipart/form-data; boundary=sampleboundary')

    expect(result.get('test')).toBe('Hello')
  })

  it('Should parse application/x-www-form-urlencoded from ArrayBuffer', () => {
    const encoder = new TextEncoder()
    const testData = 'key1=value1&key2=value2'
    const arrayBuffer = encoder.encode(testData).buffer

    const result = bufferToFormData(arrayBuffer, 'application/x-www-form-urlencoded')

    expect(result.get('key1')).toBe('value1')
    expect(result.get('key2')).toBe('value2')
  })
})
