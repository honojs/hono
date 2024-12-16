import { getColorEnabled } from './color'
import { Context } from '../context'

describe('getColorEnabled() - With colors enabled', () => {
  const mockContext = new Context(new Request('Hono is cool'))

  it('should return true', async () => {
    expect(getColorEnabled(mockContext)).toBe(true)
  })
})

describe('getColorEnabled() - With colors disabled in Edge', () => {
  const edgeContext = new Context(new Request('Hono is cool'), {
    env: {
      NO_COLOR: false,
    },
  })

  it('should return false', async () => {
    expect(getColorEnabled(edgeContext)).toBe(false)
  })
})

describe('getColorEnabled() - With NO_COLOR environment variable set', () => {
  const mockContext = new Context(new Request('Hono is cool'))

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
