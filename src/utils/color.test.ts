import { getColorEnabled, getColorEnabledAsync } from './color'

describe('getColorEnabled() / getColorEnabledAsync() - With colors enabled', () => {
  it('should return true', async () => {
    expect(getColorEnabled()).toBe(true)
    expect(await getColorEnabledAsync()).toBe(true)
  })
})

describe('getColorEnabled() / getColorEnabledAsync() - With NO_COLOR environment variable set', () => {
  beforeAll(() => {
    vi.stubEnv('NO_COLOR', '1')
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('should return false', async () => {
    expect(getColorEnabled()).toBe(false)
    expect(await getColorEnabledAsync()).toBe(false)
  })
})
