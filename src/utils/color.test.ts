import * as esbuild from 'esbuild'
import { getColorEnabled } from './color'

describe('getColorEnabled() - With colors enabled', () => {
  it('should return true', () => {
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

  it('should return false', () => {
    expect(getColorEnabled()).toBe(false)
    expect(getColorEnabled({})).toBe(false)
  })
})

describe('getColorEnabled() - Environment bindings and runtime fallbacks', () => {
  beforeEach(() => {
    vi.stubEnv('NO_COLOR', undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it.each(['1', '', false, undefined])(
    'disables colors when NO_COLOR is present with value %s',
    (value) => {
      expect(getColorEnabled({ NO_COLOR: value })).toBe(false)
    }
  )

  it('enables colors when bindings do not contain NO_COLOR', () => {
    expect(getColorEnabled({ NAME: 'Hono' })).toBe(true)
  })

  it.each([true, false])('honors Deno.noColor = %s before process.env', (noColor) => {
    vi.stubEnv('NO_COLOR', '1')
    vi.stubGlobal('Deno', { noColor })
    expect(getColorEnabled({})).toBe(!noColor)
    expect(getColorEnabled({ NO_COLOR: '' })).toBe(false)
  })

  it.each([undefined, {}])('handles a runtime without process.env: %s', (process) => {
    vi.stubGlobal('process', process)
    expect(getColorEnabled()).toBe(true)
    expect(getColorEnabled({ NO_COLOR: '' })).toBe(false)
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
