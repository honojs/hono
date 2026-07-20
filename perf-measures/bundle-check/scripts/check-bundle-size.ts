import * as esbuild from 'esbuild'
import * as fs from 'node:fs'
import * as os from 'os'
import * as path from 'path'

/**
 * Entry points to measure. `hono` is the full package; `hono/tiny` and
 * `hono/quick` are presets, and `hono/tiny` is the one we watch to tell whether
 * the smallest build stays small.
 *
 * `keyPrefix` is empty for `hono` so its metric keys stay `bundle-size-b` and
 * `bundle-size-kb`, keeping the recorded history comparable.
 */
const targets = [
  { name: 'hono', entryPoint: 'dist/index.js', keyPrefix: '' },
  { name: 'hono/tiny', entryPoint: 'dist/preset/tiny.js', keyPrefix: 'tiny-' },
  { name: 'hono/quick', entryPoint: 'dist/preset/quick.js', keyPrefix: 'quick-' },
]

const measure = async (entryPoint: string, outfile: string): Promise<number> => {
  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    minify: true,
    format: 'esm' as esbuild.Format,
    target: 'es2022',
    outfile,
  })

  return fs.statSync(outfile).size
}

async function main() {
  const tempDir = os.tmpdir()
  const tempFilePath = path.join(tempDir, 'bundle.tmp.js')

  try {
    const metrics = []

    for (const { name, entryPoint, keyPrefix } of targets) {
      const bundleSize = await measure(entryPoint, tempFilePath)

      metrics.push({
        key: `bundle-size-${keyPrefix}b`,
        name: `${name} Bundle Size (B)`,
        value: bundleSize,
        unit: 'B',
      })

      metrics.push({
        key: `bundle-size-${keyPrefix}kb`,
        name: `${name} Bundle Size (KB)`,
        value: parseFloat((bundleSize / 1024).toFixed(2)),
        unit: 'K',
      })
    }

    const benchmark = {
      key: 'bundle-size-check',
      name: 'Bundle size check',
      metrics,
    }
    console.log(JSON.stringify(benchmark, null, 2))
  } catch (error) {
    console.error('Build failed:', error)
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }
  }
}

main()
