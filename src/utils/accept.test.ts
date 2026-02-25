import { parseAccept } from './accept'

describe('parseAccept Comprehensive Tests', () => {
  describe('Basic Functionality', () => {
    test('parses simple accept header', () => {
      const header = 'text/html,application/json;q=0.9'
      expect(parseAccept(header)).toEqual([
        { type: 'text/html', params: {}, q: 1 },
        { type: 'application/json', params: { q: '0.9' }, q: 0.9 },
      ])
    })

    test('handles missing header', () => {
      expect(parseAccept('')).toEqual([])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(parseAccept(undefined as any)).toEqual([])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(parseAccept(null as any)).toEqual([])
    })
  })

  describe('Quality Values', () => {
    test('handles extreme q values', () => {
      const header = 'a;q=999999,b;q=-99999,c;q=Infinity,d;q=-Infinity,e;q=NaN'
      const result = parseAccept(header)
      expect(result.map((x) => x.q)).toEqual([1, 1, 1, 0, 0])
    })

    test('handles malformed q values', () => {
      const header = 'a;q=,b;q=invalid,c;q=1.2.3,d;q=true,e;q="0.5"'
      const result = parseAccept(header)
      expect(result.every((x) => x.q >= 0 && x.q <= 1)).toBe(true)
    })

    test('preserves original q string in params', () => {
      const header = 'type;q=invalid'
      const result = parseAccept(header)
      expect(result[0].params.q).toBe('invalid')
      expect(result[0].q).toBe(1) // Normalized q value
    })
  })

  describe('Parameter Handling', () => {
    test('handles complex parameters', () => {
      const header = 'type;a=1;b="2";c=\'3\';d="semi;colon";e="nested"quoted""'
      const result = parseAccept(header)
      expect(result[0].params).toEqual({
        a: '1',
        b: '2',
        c: "'3'",
        d: 'semi;colon',
      })
    })

    test('handles malformed parameters', () => {
      const header = 'type;=value;;key=;=;====;key====value'
      const result = parseAccept(header)
      expect(result[0].type).toBe('type')
      expect(Object.keys(result[0].params).length).toBe(0)
    })

    test('handles duplicate parameters', () => {
      const header = 'type;key=1;key=2;KEY=3'
      const result = parseAccept(header)
      expect(result[0].params.key).toBe('2')
      expect(result[0].params.KEY).toBe('3')
    })
  })

  describe('Media Type Edge Cases', () => {
    test('handles malformed media types', () => {
      const headers = [
        '*/html',
        'text/*mal/formed',
        '/partial',
        'missing/',
        'inv@lid/type',
        'text/(html)',
        'text/html?invalid',
      ]
      headers.forEach((header) => {
        const result = parseAccept(header)
        expect(result[0].type).toBe(header)
      })
    })

    test('handles extremely long types', () => {
      const longType = 'a'.repeat(10000) + '/' + 'b'.repeat(10000)
      const result = parseAccept(longType)
      expect(result[0].type).toBe(longType)
    })
  })

  describe('Delimiter Edge Cases', () => {
    test('handles multiple consecutive delimiters', () => {
      const header = 'a,,,,b;q=0.9,,,,c;q=0.8,,,,'
      const result = parseAccept(header)
      expect(result.map((x) => x.type)).toEqual(['a', 'b', 'c'])
    })

    test('handles unusual whitespace', () => {
      const header = '\n\t a \t\n ; \n\t q=0.9 \t\n , \n\t b \t\n'
      const result = parseAccept(header)
      expect(result.map((x) => x.type)).toEqual(['b', 'a'])
    })

    test('handles comma inside quoted parameter value', () => {
      const header = 'text/plain;meta="a,b";q=0.8,application/json;q=0.7'
      const result = parseAccept(header)
      expect(result).toEqual([
        {
          type: 'text/plain',
          params: {
            meta: 'a,b',
            q: '0.8',
          },
          q: 0.8,
        },
        {
          type: 'application/json',
          params: {
            q: '0.7',
          },
          q: 0.7,
        },
      ])
    })

    test('handles escaped quote and semicolon inside quoted parameter', () => {
      const header = 'text/plain;meta="a\\\";b";q=0.5'
      const result = parseAccept(header)
      expect(result).toEqual([
        {
          type: 'text/plain',
          params: {
            meta: 'a";b',
            q: '0.5',
          },
          q: 0.5,
        },
      ])
    })

    test('handles escaped character inside quoted parameter', () => {
      const header = 'text/plain;meta="a\\\\z;c";q=0.3'
      const result = parseAccept(header)
      expect(result).toEqual([
        {
          type: 'text/plain',
          params: {
            meta: 'a\\z;c',
            q: '0.3',
          },
          q: 0.3,
        },
      ])
    })
  })

  describe('Security Cases', () => {
    test('handles potential injection patterns', () => {
      const headers = [
        'type;q=0.9--',
        'type;q=0.9;drop table users',
        'type;__|;q=0.9',
        'text/html"><script>alert(1)</script>',
        'application/json${process.env}',
      ]
      headers.forEach((header) => {
        expect(() => parseAccept(header)).not.toThrow()
      })
    })

    test('handles many semicolons with an unbalanced quote', () => {
      const header = `text/plain;${'a;'.repeat(8000)}"`
      const result = parseAccept(header)
      expect(result[0].type).toBe('text/plain')
    })

    test('handles extremely large input', () => {
      const header = 'a;q=0.9,'.repeat(100000)
      expect(() => parseAccept(header)).not.toThrow()
    })
  })

  describe('Unicode and Special Characters', () => {
    test('handles unicode in types and parameters', () => {
      const header = '🌐/😊;param=🔥;q=0.9'
      const result = parseAccept(header)
      expect(result[0].type).toBe('🌐/😊')
      expect(result[0].params.param).toBe('🔥')
    })

    test('handles special characters', () => {
      const header = 'type;param=\x00\x01\x02\x03'
      const result = parseAccept(header)
      expect(result[0].params.param).toBe('\x00\x01\x02\x03')
    })
  })

  describe('Sort Stability', () => {
    test('maintains stable sort for equal q values', () => {
      const header = 'a;q=0.9,b;q=0.9,c;q=0.9,d;q=0.9'
      const result = parseAccept(header)
      expect(result.map((x) => x.type)).toEqual(['a', 'b', 'c', 'd'])
    })

    test('handles mixed priorities correctly', () => {
      const header = 'd;q=0.8,b;q=0.9,c;q=0.8,a;q=0.9'
      const result = parseAccept(header)
      expect(result.map((x) => x.type)).toEqual(['b', 'a', 'd', 'c'])
    })
  })
})
