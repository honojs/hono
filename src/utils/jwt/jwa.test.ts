import { AlgorithmTypes } from './jwa'

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
