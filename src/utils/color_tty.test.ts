import { describe, it, expect, vi, afterEach } from 'vitest'
import { getColorEnabled } from './color'

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
        isTTY: false
      }
    })

    // Currently this will FAIL (it returns true)
    expect(getColorEnabled()).toBe(false)
  })

  it('should return true if process.stdout.isTTY is true', () => {
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     const originalProcess = (globalThis as any).process
     
     vi.stubGlobal('process', {
       ...originalProcess,
       stdout: {
         ...originalProcess?.stdout,
         isTTY: true
       }
     })
 
     expect(getColorEnabled()).toBe(true)
  })
})
