import { Context } from '../context'
import { getColorEnabled } from './color'

describe('getColorEnabled() - With colors enabled', () => {
  it('should return true', async () => {
    expect(getColorEnabled()).toBe(true)
  })
})

describe('getColorEnabled() - With NO_COLOR environment variable set', () => {
  const mockContext = new Context(new Request('http://localhost/'))

  beforeAll(() => {
    vi.stubEnv('NO_COLOR', '1')
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('should return false', async () => {
    expect(getColorEnabled(mockContext)).toBe(false)
  })
})
