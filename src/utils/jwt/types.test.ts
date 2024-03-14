import type { TokenHeader } from './types'
import { AlgorithmTypes, isTokenHeader } from './types'

describe('Types', () => {
  it('AlgorithmTypes', () => {
    expect('HS256' as AlgorithmTypes).toBe(AlgorithmTypes.HS256)
    expect('HS384' as AlgorithmTypes).toBe(AlgorithmTypes.HS384)
    expect('HS512' as AlgorithmTypes).toBe(AlgorithmTypes.HS512)
    expect('RS256' as AlgorithmTypes).toBe(AlgorithmTypes.RS256)
    expect('RS384' as AlgorithmTypes).toBe(AlgorithmTypes.RS384)
    expect('RS512' as AlgorithmTypes).toBe(AlgorithmTypes.RS512)

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(undefined as AlgorithmTypes).toBe(undefined)
    expect('' as AlgorithmTypes).toBe('')
  })
})

describe('isTokenHeader', () => {
  it('should return true for valid TokenHeader', () => {
    const validTokenHeader: TokenHeader = {
      alg: AlgorithmTypes.HS256,
      typ: 'JWT',
    }

    expect(isTokenHeader(validTokenHeader)).toBe(true)
  })

  it('should return false for invalid TokenHeader', () => {
    const invalidTokenHeader = {
      alg: 'invalid',
      typ: 'JWT',
    }

    expect(isTokenHeader(invalidTokenHeader)).toBe(false)
  })
})
