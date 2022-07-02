import { getStatusText } from './http-status.ts'

describe('http-status utility', () => {
  it('getStatusText', () => {
    expect(getStatusText(200)).toBe('OK')
  })
})
