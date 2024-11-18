import * as fs from 'node:fs/promises'

async function main() {
  const currentResult = (await fs.readFile('./generated/after.js')).byteLength
  let previousResult: number | null = null
  try {
    previousResult = (await fs.readFile('./generated/before.js')).byteLength
  } catch (e) {}
  const table = ['| | Current | Previous |', '| --- | --- | --- |']
  table.push(`| Bundle Size | ${currentResult} | ${previousResult || 'N/A'} |`)
  console.log(table.join('\n'))
}

main()
