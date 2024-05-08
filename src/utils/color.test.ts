import { getColorEnabled } from './color'

describe('getColorEnabled() - With colors enabled', () => {
  it('should return true', async () => {
    expect(getColorEnabled()).toBe(true)
  })
})

describe('getColorEnabled() - With NO_COLOR environment variable set', () => {
  beforeAll(() => {
    vi.stubEnv('NO_COLOR', '1')
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('should return false', async () => {
    expect(getColorEnabled()).toBe(false)
  })
})
