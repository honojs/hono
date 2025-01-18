import * as esbuild from 'esbuild'
import * as fs from 'node:fs'
import * as os from 'os'
import * as path from 'path'

async function main() {
  const tempDir = os.tmpdir()
  const tempFilePath = path.join(tempDir, 'bundle.tmp.js')

  try {
    await esbuild.build({
      entryPoints: ['dist/index.js'],
      bundle: true,
      minify: true,
      format: 'esm' as esbuild.Format,
      target: 'es2022',
      outfile: tempFilePath,
    })

    const bundleSize = fs.statSync(tempFilePath).size
    const metrics = []

    metrics.push({
      key: 'bundle-size-b',
      name: 'Bundle Size (B)',
      value: bundleSize,
      unit: 'B',
    })

    metrics.push({
      key: 'bundle-size-kb',
      name: 'Bundle Size (KB)',
      value: parseFloat((bundleSize / 1024).toFixed(2)),
      unit: 'K',
    })

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
