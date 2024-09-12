import { describe, expect, it } from 'vitest'
import { dirname } from './utils'

describe('dirname', () => {
  it('Should dirname is valid.', () => {
    expect(dirname('parent/child')).toBe('parent')
    expect(dirname('windows\\test.txt')).toBe('windows')
  })
})
