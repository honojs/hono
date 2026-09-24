import * as esbuild from 'esbuild'
import { getColorEnabled, getColorEnabledAsync } from './color'
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'

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

describe('getColorEnabled() / getColorEnabledAsync() - With colors enabled', () => {
  beforeEach(() => {
    vi.stubGlobal('process', {
      ...globalThis.process,
      stdout: {
        ...globalThis.process?.stdout,
        isTTY: true,
      },
      env: {
        ...globalThis.process?.env,
        TERM: 'xterm', // Make sure TERM is not dumb
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

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

describe('esbuild compatibility test', () => {
  it('should build color.ts with esbuild without errors', async () => {
    try {
      const result = await esbuild.build({
        entryPoints: [__filename.replace('.test.ts', '.ts')],
        bundle: true,
        format: 'esm',
        target: 'es2022',
        write: false,
        logLevel: 'silent',
        external: [],
      })

      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.outputFiles).toHaveLength(1)

      const outputContent = result.outputFiles[0].text
      expect(outputContent).toBeDefined()
    } catch (error) {
      throw new Error(`esbuild failed: ${error}`)
    }
  })
})
