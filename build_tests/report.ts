import { readFileSync } from 'fs'
import { gzipSync } from 'zlib'
import { bundle } from './build'

const files = await bundle()

for (const file of files) {
  const appName = file.split('/').pop()?.replace('.js', '') as string
  const source = readFileSync(file).toString()
  const compressed = gzipSync(source)
  console.log(`${appName}: ${(compressed.length / 1024).toFixed(1)} KiB`)
}
