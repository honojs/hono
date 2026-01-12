import { expectTypeOf } from 'vitest'
import type { InferInput, IsLiteralUnion } from './utils'

describe('IsLiteralUnion', () => {
  it('should return true for literal union types', () => {
    expectTypeOf<IsLiteralUnion<'asc' | 'desc', string>>().toEqualTypeOf<true>()
  })

  it('should return false for single literal', () => {
    expectTypeOf<IsLiteralUnion<'asc', string>>().toEqualTypeOf<false>()
  })

  it('should return false for wide string type', () => {
    expectTypeOf<IsLiteralUnion<string, string>>().toEqualTypeOf<false>()
  })

  it('should return true for literal union with undefined', () => {
    expectTypeOf<IsLiteralUnion<'asc' | 'desc' | undefined, string>>().toEqualTypeOf<true>()
  })
})

describe('InferInput', () => {
  it('should preserve literal union types for query', () => {
    expectTypeOf<InferInput<{ orderBy: 'asc' | 'desc' }, 'query'>>().toEqualTypeOf<{
      orderBy: 'asc' | 'desc'
    }>()
  })

  it('should convert string to string | string[] for query', () => {
    expectTypeOf<InferInput<{ page: string }, 'query'>>().toEqualTypeOf<{
      page: string | string[]
    }>()
  })

  it('should convert number to string | string[] for query', () => {
    expectTypeOf<InferInput<{ page: number }, 'query'>>().toEqualTypeOf<{
      page: string | string[]
    }>()
  })

  it('should preserve optional union (T | undefined) for query', () => {
    expectTypeOf<InferInput<{ name?: string | undefined }, 'query'>>().toEqualTypeOf<{
      name?: string | undefined
    }>()
  })

  it('should preserve literal union with undefined for query', () => {
    expectTypeOf<InferInput<{ orderBy?: 'asc' | 'desc' | undefined }, 'query'>>().toEqualTypeOf<{
      orderBy?: 'asc' | 'desc' | undefined
    }>()
  })

  it('should convert unknown to string | string[] for query (coerce support)', () => {
    expectTypeOf<InferInput<{ page: unknown }, 'query'>>().toEqualTypeOf<{
      page: string | string[]
    }>()
  })

  it('should handle object | undefined for query (optional schema)', () => {
    expectTypeOf<InferInput<{ name?: string | undefined } | undefined, 'query'>>().toEqualTypeOf<
      { name?: string | undefined } | undefined
    >()
  })

  it('should convert string to string for param', () => {
    expectTypeOf<InferInput<{ id: string }, 'param'>>().toEqualTypeOf<{
      id: string
    }>()
  })

  it('should convert string to string for header', () => {
    expectTypeOf<InferInput<{ authorization: string }, 'header'>>().toEqualTypeOf<{
      authorization: string
    }>()
  })

  it('should convert string to string for cookie', () => {
    expectTypeOf<InferInput<{ session: string }, 'cookie'>>().toEqualTypeOf<{
      session: string
    }>()
  })
})
