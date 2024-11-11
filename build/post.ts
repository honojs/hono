import { stdout } from 'bun'
import * as glob from 'glob'
import * as fs from 'fs'
import { removePrivateFields } from './remove-private-fields'

// Remove #private fields
const dtsEntries = glob.globSync('./dist/types/**/*.d.ts')
const writer = stdout.writer()
writer.write('\n')
let lastOutputLength = 0
for (let i = 0; i < dtsEntries.length; i++) {
  const entry = dtsEntries[i]

  const message = `Removing private fields(${i}/${dtsEntries.length}): ${entry}`
  writer.write(`\r${' '.repeat(lastOutputLength)}`)
  lastOutputLength = message.length
  writer.write(`\r${message}`)

  fs.writeFileSync(entry, removePrivateFields(entry))
}
writer.write('\n')
