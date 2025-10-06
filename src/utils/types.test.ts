import type { JSONParsed, JSONValue } from './types'

describe('JSONParsed', () => {
  enum SampleEnum {
    Value1 = 'value1',
    Value2 = 'value2',
  }

  interface Meta {
    metadata: {
      href: string
      sampleEnum: SampleEnum
    }
  }

  interface SampleInterface {
    someMeta: Meta
  }

  type SampleType = {
    someMeta: Meta
  }

  describe('primitives', () => {
    it('should convert number type to number', () => {
      type Actual = JSONParsed<number>
      type Expected = number
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert string type to string', () => {
      type Actual = JSONParsed<string>
      type Expected = string
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert boolean type to boolean', () => {
      type Actual = JSONParsed<boolean>
      type Expected = boolean
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert null type to null', () => {
      type Actual = JSONParsed<null>
      type Expected = null
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
  })

  describe('toJSON', () => {
    it('should convert { toJSON() => T } to T', () => {
      type Actual = JSONParsed<{ toJSON(): number }>
      type Expected = number
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('toJSON is not called recursively', () => {
      type Actual = JSONParsed<{ toJSON(): { toJSON(): number } }>
      type Expected = {}
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert { a: { toJSON() => T } } to { a: T }', () => {
      type Actual = JSONParsed<{ a: { toJSON(): number } }>
      type Expected = { a: number }
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert invalid type with { toJSON() => T to T', () => {
      type Actual = JSONParsed< bigint & { toJSON(): string }>
      type Expected = string
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
  })

  describe('invalid types', () => {
    it('should convert undefined type to never', () => {
      type Actual = JSONParsed<undefined>
      type Expected = never
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert symbol type to never', () => {
      type Actual = JSONParsed<symbol>
      type Expected = never
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert function type to never', () => {
      type Actual = JSONParsed<() => void>
      type Expected = never
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert bigint type to never', () => {
      type Actual = JSONParsed<bigint>
      type Expected = never
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
  })

  describe('array', () => {
    it('should convert undefined[] type to null[]', () => {
      type Actual = JSONParsed<undefined[]>
      type Expected = null[]
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert Function[] type to null[]', () => {
      type Actual = JSONParsed<(() => void)[]>
      type Expected = null[]
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert symbol[] type to null[]', () => {
      type Actual = JSONParsed<symbol[]>
      type Expected = null[]
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert (T | undefined)[] type to JSONParsedT | null>[]', () => {
      type Actual = JSONParsed<(number | undefined)[]>
      type Expected = (number | null)[]
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert { key: readonly T[]} correctly', () => {
      type Actual = JSONParsed<{ key: readonly number[] }>
      type Expected = { key: readonly number[] }
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
  })

  describe('tuple', () => {
    it('should convert [T, S] type to [T, S]', () => {
      type Actual = JSONParsed<[number, string]>
      type Expected = [number, string]
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert [T, undefined] type to [T, null]', () => {
      type Actual = JSONParsed<[number, undefined]>
      type Expected = [number, null]
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
  })

  describe('object', () => {
    it('should omit keys with undefined value', () => {
      type Actual = JSONParsed<{ a: number; b: undefined }>
      type Expected = { a: number }
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should omit keys with symbol value', () => {
      type Actual = JSONParsed<{ a: number; b: symbol }>
      type Expected = { a: number }
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should omit keys with function value', () => {
      type Actual = JSONParsed<{ a: number; b: () => void }>
      type Expected = { a: number }
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should omit symbol keys', () => {
      type Actual = JSONParsed<{ a: number; [x: symbol]: number }>
      type Expected = { a: number }
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert T | undefined to T | undefined', () => {
      type Actual = JSONParsed<{ a: number; b: number | undefined }>
      type Expected = { a: number; b: number | undefined }
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should omit keys with invalid union', () => {
      type Actual = JSONParsed<{ a: number; b: undefined | symbol }>
      type Expected = { a: number }
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
  })

  describe('unknown', () => {
    it('should convert unknown type to unknown', () => {
      type Actual = JSONParsed<unknown>
      type Expected = JSONValue
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })

    it('Should convert unknown value to JSONValue', () => {
      type Actual = JSONParsed<{ value: unknown }>
      type Expected = { value: JSONValue }
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
  })

  describe('Set/Map', () => {
    it('should convert Set to empty object', () => {
      type Actual = JSONParsed<Set<number>>
      type Expected = {}
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
    it('should convert Map to empty object', () => {
      type Actual = JSONParsed<Map<number, number>>
      type Expected = {}
      expectTypeOf<Actual>().toEqualTypeOf<Expected>()
    })
  })

  it('Should parse a complex type', () => {
    const sample: JSONParsed<SampleType> = {
      someMeta: {
        metadata: {
          href: '',
          sampleEnum: SampleEnum.Value1,
        },
      },
    }
    expectTypeOf(sample).toEqualTypeOf<SampleType>()
  })

  it('Should parse a complex interface', () => {
    const sample: JSONParsed<SampleInterface> = {
      someMeta: {
        metadata: {
          href: '',
          sampleEnum: SampleEnum.Value1,
        },
      },
    }
    expectTypeOf(sample).toEqualTypeOf<SampleInterface>()
  })

  it('Should convert Date to string', () => {
    type Post = {
      datetime: Date
    }
    type Expected = {
      datetime: string
    }
    type Actual = JSONParsed<Post>
    expectTypeOf<Actual>().toEqualTypeOf<Expected>()
  })

  it('Should convert bigint to never', () => {
    type Post = {
      num: bigint
    }
    type Expected = never
    type Actual = JSONParsed<Post>
    expectTypeOf<Actual>().toEqualTypeOf<Expected>()
  })

  it('Should convert bigint when TError is provided', () => {
    type Post = {
      num: bigint
    }
    type Expected = {
      num: JSONValue
    }
    type Actual = JSONParsed<Post, never>
    expectTypeOf<Actual>().toEqualTypeOf<Expected>()
  })

  it('Should convert bigint[] to never', () => {
    type Post = {
      nums: bigint[]
    }
    type Expected = never
    type Actual = JSONParsed<Post>
    expectTypeOf<Actual>().toEqualTypeOf<Expected>()
  })

  it('Should convert bigint[] when TError is provided', () => {
    type Post = {
      num: bigint[]
    }
    type Expected = {
      num: JSONValue[]
    }
    type Actual = JSONParsed<Post, never>
    expectTypeOf<Actual>().toEqualTypeOf<Expected>()
  })

  it('Should parse bigint with a toJSON function', () => {
    class SafeBigInt {
      unsafe = BigInt('42')

      toJSON() {
        return {
          unsafe: '42n',
        }
      }
    }

    type Actual = JSONParsed<SafeBigInt>
    type Expected = { unsafe: string }
    expectTypeOf<Actual>().toEqualTypeOf<Expected>()
  })
})
