import { AlgorithmTypes } from './types'

describe('Types', () => {
  it('AlgorithmTypes', () => {
    expect('HS256' as AlgorithmTypes).toBe(AlgorithmTypes.HS256)
    expect('HS384' as AlgorithmTypes).toBe(AlgorithmTypes.HS384)
    expect('HS512' as AlgorithmTypes).toBe(AlgorithmTypes.HS512)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(undefined as AlgorithmTypes).toBe(undefined)
    expect('' as AlgorithmTypes).toBe('')
  })
})
