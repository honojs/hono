import { exec, execSync } from "node:child_process"

describe('moddable', () => {
  beforeAll(() => {
    execSync('bun build runtime-tests/moddable/tests/app.ts --external socket --external streams --external text/decoder --external text/encoder --external headers --outdir runtime-tests/moddable/dist')
  })
  it('dist', () => {
    exec(`mcconfig -dl -m -p lin`)
  })
})
