import { getStatusText } from './http-status'

describe('http-status utility', () => {
  it('getStatusText', () => {
    expect(getStatusText(200)).toBe('OK')
  })
})
