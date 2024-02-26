import { getColorEnabled } from './color'

describe('getColorEnabled()', () => {
  it('getColorEnabled() is true', async () => {
    expect(getColorEnabled()).toBe(true)
  })
})
describe('getColorEnabled() in NO_COLOR', () => {
  beforeAll(() => {
    vi.stubEnv('NO_COLOR', '1')
  })
  afterAll(() => {
    vi.unstubAllEnvs()
  })
  it('getColorEnabled() is false', async () => {
    expect(getColorEnabled()).toBe(false)
  })
})
