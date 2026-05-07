import { createHash } from 'crypto'
import { bufferToFormData, bufferToString, equal, timingSafeEqual } from './buffer'

describe('equal', () => {
  it('should return true for identical ArrayBuffers', () => {
    const buffer1 = new ArrayBuffer(1)
    const buffer2 = buffer1
    expect(equal(buffer1, buffer2)).toBe(true)
  })

  it('should return false for ArrayBuffers of different lengths', () => {
    const buffer1 = new ArrayBuffer(1)
    const buffer2 = new ArrayBuffer(2)
    expect(equal(buffer1, buffer2)).toBe(false)
  })

  it('should return false for ArrayBuffers with different content', () => {
    const buffer1 = new Uint8Array([1, 2, 3, 4]).buffer
    const buffer2 = new Uint8Array([2, 2, 3, 4]).buffer
    expect(equal(buffer1, buffer2)).toBe(false)
  })

  it('should return true for ArrayBuffers with identical content', () => {
    const buffer1 = new Uint8Array([1, 2, 3, 4]).buffer
    const buffer2 = new Uint8Array([1, 2, 3, 4]).buffer
    expect(equal(buffer1, buffer2)).toBe(true)
  })
})

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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(await timingSafeEqual(false, undefined)).toBe(false)

    expect(
      await timingSafeEqual(
        // well known md5 hash collision
        // https://marc-stevens.nl/research/md5-1block-collision/
        'TEXTCOLLBYfGiJUETHQ4hAcKSMd5zYpgqf1YRDhkmxHkhPWptrkoyz28wnI9V0aHeAuaKnak',
        'TEXTCOLLBYfGiJUETHQ4hEcKSMd5zYpgqf1YRDhkmxHkhPWptrkoyz28wnI9V0aHeAuaKnak',
        (input) => createHash('md5').update(input).digest('hex')
      )
    ).toBe(false)
  })

  it.skip('comparing variables except string are deprecated', async () => {
    expect(await timingSafeEqual(true, true)).toBe(true)
    expect(await timingSafeEqual(false, false)).toBe(true)
    expect(
      await timingSafeEqual(true, true, (d: boolean) =>
        createHash('sha256').update(d.toString()).digest('hex')
      )
    )
    expect(await timingSafeEqual(false, true)).toBe(false)
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
    expect(await timingSafeEqual('a', 'b', () => undefined)).toBe(false)
  })
})

describe('bufferToString', () => {
  it('Should return あいうえお', () => {
    const bytes = [227, 129, 130, 227, 129, 132, 227, 129, 134, 227, 129, 136, 227, 129, 138]
    const buffer = Uint8Array.from(bytes).buffer
    expect(bufferToString(buffer)).toBe('あいうえお')
  })
  it('should return the passed arguments as is ', () => {
    const notBuffer = 'あいうえお' as unknown as ArrayBuffer
    expect(bufferToString(notBuffer)).toBe('あいうえお')
  })
})

describe('bufferToFormData', () => {
  it('Should parse multipart/form-data from ArrayBuffer', async () => {
    const encoder = new TextEncoder()
    const testData =
      '--sampleboundary\r\nContent-Disposition: form-data; name="test"\r\n\r\nHello\r\n--sampleboundary--'
    const arrayBuffer = encoder.encode(testData).buffer

    const result = await bufferToFormData(
      arrayBuffer,
      'multipart/form-data; boundary=sampleboundary'
    )

    expect(result.get('test')).toBe('Hello')
  })

  it('Should parse application/x-www-form-urlencoded from ArrayBuffer', async () => {
    const encoder = new TextEncoder()
    const searchParams = new URLSearchParams()
    searchParams.append('id', '123')
    searchParams.append('title', 'Good title')
    const testData = searchParams.toString()
    const arrayBuffer = encoder.encode(testData).buffer

    const result = await bufferToFormData(arrayBuffer, 'application/x-www-form-urlencoded')

    expect(result.get('id')).toBe('123')
    expect(result.get('title')).toBe('Good title')
  })
})
