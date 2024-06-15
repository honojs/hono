import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import glob from 'glob'
import { build } from 'esbuild'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const bundle = async (): Promise<string[]> => {
  const outdir = tmpdir()

  await build({
    entryPoints: glob.sync(__dirname + '/src/*.{ts,tsx}'),
    sourcemap: true,
    bundle: true,
    treeShaking: true,
    minify: true,
    outbase: __dirname + '/src',
    outdir,
    format: 'esm',
  })
  return glob.sync(`${outdir}/*.js`)
}
