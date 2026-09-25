import { glob } from 'node:fs/promises'
import { removePrivateFields } from './remove-private-fields.ts'

const dtsEntries: string[] = []
for await (const file of glob('dist/types/**/*.d.ts')) {
  dtsEntries.push(file)
}
await removePrivateFields(dtsEntries)
