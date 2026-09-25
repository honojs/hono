import fs from 'node:fs'
import { validateExports } from './validate-exports.ts'

const readJsonExports = (path: string) => JSON.parse(fs.readFileSync(path, 'utf-8')).exports

const [packageJsonExports, jsrJsonExports] = ['./package.json', './jsr.json'].map(readJsonExports)

validateExports(packageJsonExports, jsrJsonExports, 'jsr.json')
validateExports(jsrJsonExports, packageJsonExports, 'package.json')
