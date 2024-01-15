/* eslint-disable @typescript-eslint/ban-ts-comment */
import { decodeBase64Url, encodeBase64Url } from './encode'

const toURLBase64 = (base64String: string): string =>
  base64String.replace(/\+|\//g, (m) => ({ '+': '-', '/': '_' }[m] ?? m))

const str2UInt8Array = (s: string): Uint8Array => {
  const buffer = new Uint8Array(new ArrayBuffer(s.length))
  for (let i = 0, len = buffer.byteLength; i < len; i++) {
    buffer[i] = s.charCodeAt(i)
  }
  return buffer
}

describe('base64', () => {
  const utf8Encoder = new TextEncoder()
  describe.each([
    // basic
    [utf8Encoder.encode('Hello, 世界'), 'SGVsbG8sIOS4lueVjA=='],
    [utf8Encoder.encode('炎'), '54KO'],
    [utf8Encoder.encode('🔥'), '8J+UpQ=='],
    [
      utf8Encoder.encode('http://github.com/honojs/hono'),
      'aHR0cDovL2dpdGh1Yi5jb20vaG9ub2pzL2hvbm8=',
    ],

    // RFC 3548 examples
    [str2UInt8Array('\x14\xfb\x9c\x03\xd9\x7e'), 'FPucA9l+'],
    [str2UInt8Array('\x14\xfb\x9c\x03\xd9'), 'FPucA9k='],
    [str2UInt8Array('\x14\xfb\x9c\x03'), 'FPucAw=='],

    // RFC 4648 examples
    [str2UInt8Array(''), ''],
    [str2UInt8Array('f'), 'Zg=='],
    [str2UInt8Array('fo'), 'Zm8='],
    [str2UInt8Array('foo'), 'Zm9v'],
    [str2UInt8Array('foob'), 'Zm9vYg=='],
    [str2UInt8Array('fooba'), 'Zm9vYmE='],
    [str2UInt8Array('foobar'), 'Zm9vYmFy'],

    // Wikipedia examples
    [str2UInt8Array('sure.'), 'c3VyZS4='],
    [str2UInt8Array('sure'), 'c3VyZQ=='],
    [str2UInt8Array('sur'), 'c3Vy'],
    [str2UInt8Array('su'), 'c3U='],
    [str2UInt8Array('leasure.'), 'bGVhc3VyZS4='],
    [str2UInt8Array('easure.'), 'ZWFzdXJlLg=='],
    [str2UInt8Array('asure.'), 'YXN1cmUu'],
    [str2UInt8Array('sure.'), 'c3VyZS4='],
  ])('%s, %s', (stdDecoded, stdEncoded) => {
    it('encode', () => {
      const got = encodeBase64Url(stdDecoded)
      const want = toURLBase64(stdEncoded)
      expect(got).toStrictEqual(want)
    })
    it('decode', () => {
      const got = decodeBase64Url(toURLBase64(stdEncoded))
      const want = stdDecoded
      expect(got).toStrictEqual(want)
    })
  })
})
