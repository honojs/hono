import * as esbuild from 'esbuild'
import { getColorEnabled, getColorEnabledAsync } from './color'

const originalStdoutDescriptor = Object.getOwnPropertyDescriptor(process, 'stdout')

const mockStdoutTTY = (isTTY: boolean) => {
  Object.defineProperty(process, 'stdout', {
    configurable: true,
    enumerable: true,
    get: () =>
      ({
        isTTY,
      }) as typeof process.stdout,
  })
}

const restoreStdout = () => {
  if (originalStdoutDescriptor) {
    Object.defineProperty(process, 'stdout', originalStdoutDescriptor)
  }
}

describe('getColorEnabled() / getColorEnabledAsync() - With colors enabled', () => {
  beforeAll(() => {
    mockStdoutTTY(true)
  })

  afterAll(() => {
    restoreStdout()
  })

  it('should return true', async () => {
    expect(getColorEnabled()).toBe(true)
    expect(await getColorEnabledAsync()).toBe(true)
  })
})

describe('getColorEnabled() / getColorEnabledAsync() - With NO_COLOR environment variable set', () => {
  beforeAll(() => {
    mockStdoutTTY(true)
    vi.stubEnv('NO_COLOR', '1')
  })

  afterAll(() => {
    restoreStdout()
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
