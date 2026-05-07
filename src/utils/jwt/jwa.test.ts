import { AlgorithmTypes } from './jwa'
import type { AsymmetricAlgorithm, SymmetricAlgorithm, SignatureAlgorithm } from './jwa'

describe('Types', () => {
  it('AlgorithmTypes', () => {
    expect('HS256' as AlgorithmTypes).toBe(AlgorithmTypes.HS256)
    expect('HS384' as AlgorithmTypes).toBe(AlgorithmTypes.HS384)
    expect('HS512' as AlgorithmTypes).toBe(AlgorithmTypes.HS512)
    expect('RS256' as AlgorithmTypes).toBe(AlgorithmTypes.RS256)
    expect('RS384' as AlgorithmTypes).toBe(AlgorithmTypes.RS384)
    expect('RS512' as AlgorithmTypes).toBe(AlgorithmTypes.RS512)
    expect('PS256' as AlgorithmTypes).toBe(AlgorithmTypes.PS256)
    expect('PS384' as AlgorithmTypes).toBe(AlgorithmTypes.PS384)
    expect('PS512' as AlgorithmTypes).toBe(AlgorithmTypes.PS512)
    expect('ES256' as AlgorithmTypes).toBe(AlgorithmTypes.ES256)
    expect('ES384' as AlgorithmTypes).toBe(AlgorithmTypes.ES384)
    expect('ES512' as AlgorithmTypes).toBe(AlgorithmTypes.ES512)
    expect('EdDSA' as AlgorithmTypes).toBe(AlgorithmTypes.EdDSA)

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(undefined as AlgorithmTypes).toBe(undefined)
    expect('' as AlgorithmTypes).toBe('')
  })

  it('SymmetricAlgorithm type should only include HMAC algorithms', () => {
    // These should be valid SymmetricAlgorithm values
    const hs256: SymmetricAlgorithm = 'HS256'
    const hs384: SymmetricAlgorithm = 'HS384'
    const hs512: SymmetricAlgorithm = 'HS512'

    expect(hs256).toBe('HS256')
    expect(hs384).toBe('HS384')
    expect(hs512).toBe('HS512')

    // Type-level test: these would cause compile errors if uncommented
    // const rs256: SymmetricAlgorithm = 'RS256' // Error: Type '"RS256"' is not assignable to type 'SymmetricAlgorithm'
  })

  it('AsymmetricAlgorithm type should only include asymmetric algorithms', () => {
    // These should be valid AsymmetricAlgorithm values
    const asymmetricAlgs: AsymmetricAlgorithm[] = [
      'RS256',
      'RS384',
      'RS512',
      'PS256',
      'PS384',
      'PS512',
      'ES256',
      'ES384',
      'ES512',
      'EdDSA',
    ]

    expect(asymmetricAlgs).toHaveLength(10)

    // Verify all asymmetric algorithms are included
    expect(asymmetricAlgs).toContain('RS256')
    expect(asymmetricAlgs).toContain('ES256')
    expect(asymmetricAlgs).toContain('EdDSA')

    // Type-level test: these would cause compile errors if uncommented
    // const hs256: AsymmetricAlgorithm = 'HS256' // Error: Type '"HS256"' is not assignable to type 'AsymmetricAlgorithm'
  })

  it('SignatureAlgorithm type should include all algorithms', () => {
    // SignatureAlgorithm should include both symmetric and asymmetric algorithms
    const allAlgs: SignatureAlgorithm[] = [
      'HS256',
      'HS384',
      'HS512',
      'RS256',
      'RS384',
      'RS512',
      'PS256',
      'PS384',
      'PS512',
      'ES256',
      'ES384',
      'ES512',
      'EdDSA',
    ]

    expect(allAlgs).toHaveLength(13)
  })
})
