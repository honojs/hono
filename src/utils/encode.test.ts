import {
  utf8ToUint8Array,
  decodeBase64,
  encodeBase64,
  encodeBase64URL,
  decodeBase64URL,
} from './encode'

describe('encode', () => {
  describe('base64', () => {
    it('encodeBase64', () => {
      expect(encodeBase64('hooooooooo')).toBe('aG9vb29vb29vbw==')
      expect(encodeBase64('炎')).toBe('54KO')
      expect(encodeBase64('abcdef')).not.toBe('abcdedf')
      expect(encodeBase64('')).toBe('')
      expect(() => {
        encodeBase64(null)
      }).toThrow(TypeError)
    })

    it('decodeBase64', async () => {
      expect(decodeBase64('aG9vb29vb29vbw==')).toBe('hooooooooo')
      expect(decodeBase64('54KO')).toBe('炎')
      expect(decodeBase64('abcdedf')).not.toBe('abcdef')
      expect(decodeBase64('')).toBe('')
      expect(() => {
        decodeBase64(null)
      }).toThrowError(TypeError)
    })
  })
  describe('base64url', () => {
    it('encodeBase64URL', () => {
      expect(encodeBase64URL('hooooooooo')).toBe('aG9vb29vb29vbw')
      expect(encodeBase64URL('http://github.com/honojs/hono')).toBe(
        'aHR0cDovL2dpdGh1Yi5jb20vaG9ub2pzL2hvbm8'
      )
      expect(encodeBase64URL('炎')).toBe('54KO')
      expect(encodeBase64URL('abcdef')).not.toBe('abcdedf')
      expect(encodeBase64URL('')).toBe('')
      expect(() => {
        encodeBase64URL(null)
      }).toThrow(TypeError)
    })

    it('decodeBase64URL', async () => {
      expect(decodeBase64URL('aG9vb29vb29vbw')).toBe('hooooooooo')
      expect(decodeBase64URL('aHR0cDovL2dpdGh1Yi5jb20vaG9ub2pzL2hvbm8')).toBe(
        'http://github.com/honojs/hono'
      )
      expect(decodeBase64URL('54KO')).toBe('炎')
      expect(decodeBase64URL('abcdedf')).not.toBe('abcdef')
      expect(decodeBase64URL('')).toBe('')
      expect(() => {
        decodeBase64URL(null)
      }).toThrowError(TypeError)
    })
  })

  describe('utf8ToUint8Array', () => {
    it('should be equal', () => {
      const k = 'a-secret-key'
      const arr = utf8ToUint8Array(k)
      expect(String(arr)).toEqual('97,45,115,101,99,114,101,116,45,107,101,121')
    })
  })
})
