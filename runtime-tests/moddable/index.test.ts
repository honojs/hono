import { exec, execSync, spawn } from "node:child_process"

let isModdableInstalled = true
try {
  execSync('cd runtime-tests/moddable && mcconfig', { stdio: 'ignore' })
} catch (error) {
  isModdableInstalled = false
}
let moddableEnvironment: 'win' | 'mac' | 'lin' | undefined = undefined
if (process.platform === 'win32') {
  moddableEnvironment = 'win'
} else if (process.platform === 'darwin') {
  moddableEnvironment = 'mac'
} else if (process.platform === 'linux') {
  moddableEnvironment = 'lin'
} else {
  throw new Error(`Unsupported platform: ${process.platform}`)
}
if (!moddableEnvironment) {
  console.warn('Moddable environment not set, skipping tests.')
}

const skip = !isModdableInstalled || !moddableEnvironment

describe('moddable', { skip },  (aa) => {
  beforeAll(() => {
    execSync('bun build runtime-tests/moddable/tests/main.ts --external socket --external streams --external text/decoder --external text/encoder --external headers --outdir runtime-tests/moddable/dist')
  })
  it('dist', {
    timeout: 1000 * 60 * 5 // 5 minutes
  }, async () => {
    const mcconfigProc = spawn('mcconfig', ['-m', '-dl', '-p', moddableEnvironment], {
      cwd: 'runtime-tests/moddable',
    })
    await new Promise<void>((resolve, reject) => {
      mcconfigProc.on('error', (err) => {
        reject(err)
      })
      let output = ''
      mcconfigProc.stdout.on('data', data => {
        output += data.toString()
        console.log(output)
        if (output.includes('connected to "moddable"')) {
          resolve()
        }
      })
    })
    expect(await fetch('http://localhost:3000').then(res => res.text())).toEqual('{"hono":"moddable"}')
    mcconfigProc.kill('SIGSTOP')
  })
})
