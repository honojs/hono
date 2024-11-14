import * as fs from 'node:fs/promises'

async function main() {
    const currentResult = (await fs.readFile('./generated/after.js')).byteLength
    const previousResult = (await fs.readFile('./generated/before.js')).byteLength
    const table = ['| | Current | Previous |', '| --- | --- | --- |']
    table.push(`| Bundle Size | ${currentResult} | ${previousResult} |`)
    console.log(table.join('\n'))
}

main()
