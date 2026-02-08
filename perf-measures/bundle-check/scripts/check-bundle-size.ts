import * as esbuild from 'esbuild'
import * as fs from 'node:fs'
import * as os from 'os'
import * as path from 'path'

interface BundleTarget {
  entryPoint: string
  label: string
  keyPrefix: string
}

const targets: BundleTarget[] = [
  { entryPoint: 'dist/index.js', label: 'hono', keyPrefix: 'bundle-size' },
  { entryPoint: 'dist/preset/tiny.js', label: 'hono/tiny', keyPrefix: 'bundle-size-tiny' },
]

async function measureBundle(target: BundleTarget, tempDir: string) {
  const tempFilePath = path.join(tempDir, `${target.keyPrefix}.tmp.js`)

  try {
    await esbuild.build({
      entryPoints: [target.entryPoint],
      bundle: true,
      minify: true,
      format: 'esm' as esbuild.Format,
      target: 'es2022',
      outfile: tempFilePath,
    })

    const bundleSize = fs.statSync(tempFilePath).size

    return [
      {
        key: `${target.keyPrefix}-b`,
        name: `Bundle Size - ${target.label} (B)`,
        value: bundleSize,
        unit: 'B',
      },
      {
        key: `${target.keyPrefix}-kb`,
        name: `Bundle Size - ${target.label} (KB)`,
        value: parseFloat((bundleSize / 1024).toFixed(2)),
        unit: 'K',
      },
    ]
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }
  }
}

async function main() {
  const tempDir = os.tmpdir()

  try {
    const metrics = []

    for (const target of targets) {
      const targetMetrics = await measureBundle(target, tempDir)
      metrics.push(...targetMetrics)
    }

    const benchmark = {
      key: 'bundle-size-check',
      name: 'Bundle size check',
      metrics,
    }
    console.log(JSON.stringify(benchmark, null, 2))
  } catch (error) {
    console.error('Build failed:', error)
  }
}

main()
