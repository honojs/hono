import { describe, it, expect, vi, afterEach } from 'vitest'
import { getColorEnabled } from './color'

vi.mock('./flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./flags')>()
  return {
    ...actual,
    get hasTTY() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return !!(globalThis as any).process?.stdout?.isTTY
    },
  }
})

describe('getColorEnabled() TTY detection', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return false if process.stdout.isTTY is false', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalProcess = (globalThis as any).process

    // Mocking process.stdout.isTTY
    vi.stubGlobal('process', {
      ...originalProcess,
      stdout: {
        ...originalProcess?.stdout,
        isTTY: false,
      },
    })

    expect(getColorEnabled()).toBe(false)
  })

  it('should return true if process.stdout.isTTY is true', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalProcess = (globalThis as any).process

    vi.stubGlobal('process', {
      ...originalProcess,
      stdout: {
        ...originalProcess?.stdout,
        isTTY: true,
      },
    })

    expect(getColorEnabled()).toBe(true)
  })
})
