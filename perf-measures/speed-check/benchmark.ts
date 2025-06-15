/**
 * Hono HTTP Performance Benchmark
 *
 * This benchmark tool is inspired by and references the bun-http-framework-benchmark project:
 * https://github.com/honojs/bun-http-framework-benchmark
 *
 * Some test patterns and bombardier usage are adapted from that repository.
 *
 * Usage:
 *   bun run benchmark.ts [--baseline=main] [--target=current] [--runs=3]
 *
 * Examples:
 *   bun run benchmark.ts                           # Compare current branch vs main
 *   bun run benchmark.ts --runs=5                  # Run 5 times for more accuracy
 *   bun run benchmark.ts --baseline=v4.7.11       # Compare against specific tag
 */

import { spawn } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'

interface BenchmarkConfig {
  baseline: string
  target: string
  runs: number
  duration: number
  concurrency: number
}

interface BenchmarkResult {
  name: string
  average: number
  ping: number
  query: number
  body: number
  runs: number[]
}

const CONFIG: BenchmarkConfig = {
  baseline: process.argv.find((arg) => arg.startsWith('--baseline='))?.split('=')[1] || 'main',
  target: process.argv.find((arg) => arg.startsWith('--target='))?.split('=')[1] || 'current',
  runs: parseInt(process.argv.find((arg) => arg.startsWith('--runs='))?.split('=')[1] || '1'),
  duration: 10,
  concurrency: 500,
}

const TEMP_DIR = join(process.cwd(), '.benchmark-temp')
const HONO_ROOT = join(process.cwd(), '../..')

class BenchmarkRunner {
  private testApps = new Map<string, string>()

  constructor() {
    this.setupTempDir()
    this.createTestApps()
  }

  private setupTempDir() {
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true })
    }
    mkdirSync(TEMP_DIR, { recursive: true })

    // Create JSON payload file for POST test
    writeFileSync(join(TEMP_DIR, 'body.json'), '{"hello":"world"}')
  }

  private createTestApps() {
    // Test app template adapted from bun-http-framework-benchmark
    // https://github.com/honojs/bun-http-framework-benchmark/blob/main/src/bun/hono.ts
    const appTemplate = `import { Hono } from './hono-dist/index.js'
import { RegExpRouter } from './hono-dist/router/reg-exp-router/index.js'

const app = new Hono({ router: new RegExpRouter() })

app.get('/', (c) => c.text('Hi'))
  .post('/json', (c) => c.req.json().then(c.json))
  .get('/id/:id', (c) => {
    const id = c.req.param('id')
    const name = c.req.query('name')
    c.header('x-powered-by', 'benchmark')
    return c.text(\`\${id} \${name}\`)
  })

export default app`

    this.testApps.set('baseline', appTemplate)
    this.testApps.set('target', appTemplate)
  }

  async buildVersion(version: string, name: string) {
    console.log(`📦 Building ${name} (${version})...`)

    // Save current state if targeting current branch
    let needsRestore = false
    let stashRef = ''

    if (version === 'current') {
      // Just build current state
      await this.runCommand('bun run build', HONO_ROOT)
    } else {
      // Stash current changes and checkout target version
      try {
        const stashResult = await this.runCommand('git stash push -m "benchmark-temp"', HONO_ROOT)
        needsRestore = stashResult.stdout.includes('Saved working directory')
        if (needsRestore) {
          stashRef = 'stash@{0}'
        }
      } catch {
        // No changes to stash
      }

      await this.runCommand(`git checkout ${version}`, HONO_ROOT)
      await this.runCommand('bun install', HONO_ROOT)
      await this.runCommand('bun run build', HONO_ROOT)
    }

    // Run endpoint tests to ensure app is working correctly
    console.log(`🧪 Testing endpoints for ${name}...`)
    const versionDir = join(TEMP_DIR, name)
    mkdirSync(versionDir, { recursive: true })

    // Copy built files first
    await this.runCommand(`cp -r ${HONO_ROOT}/dist ${versionDir}/hono-dist`, process.cwd())

    // Create test app
    const appPath = join(versionDir, 'app.ts')
    writeFileSync(appPath, this.testApps.get(name === 'baseline' ? 'baseline' : 'target')!)

    await this.testEndpoints(appPath, name)

    // Restore original state if needed
    if (version !== 'current' && needsRestore) {
      await this.runCommand('git checkout -', HONO_ROOT)
      await this.runCommand(`git stash pop ${stashRef}`, HONO_ROOT)
    } else if (version !== 'current') {
      await this.runCommand('git checkout -', HONO_ROOT)
    }

    return appPath
  }

  async testEndpoints(appPath: string, name: string) {
    console.log(`  Starting test server for ${name}...`)

    // Start server
    const server = spawn('bun', [appPath], {
      cwd: TEMP_DIR,
      env: { ...process.env, NODE_ENV: 'production' },
    })

    // Wait for server to start
    await this.sleep(2000)

    try {
      // Test 1: GET / should return "Hi"
      const res1 = await fetch('http://127.0.0.1:3000/')
      const text1 = await res1.text()
      if (text1 !== 'Hi') {
        throw new Error(`[GET /] Expected "Hi", got "${text1}"`)
      }

      // Test 2: GET /id/:id should set header and return params and query
      const res2 = await fetch('http://127.0.0.1:3000/id/1?name=bun')
      const poweredBy = res2.headers.get('x-powered-by')
      const text2 = await res2.text()

      if (poweredBy !== 'benchmark') {
        throw new Error(
          `[GET /id/:id] Expected x-powered-by header "benchmark", got "${poweredBy}"`
        )
      }
      if (text2 !== '1 bun') {
        throw new Error(`[GET /id/:id] Expected "1 bun", got "${text2}"`)
      }

      // Test 3: POST /json should mirror json result
      const body = JSON.stringify({ hello: 'world' })
      const res3 = await fetch('http://127.0.0.1:3000/json', {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'content-length': body.length.toString(),
        },
      })

      const contentType = res3.headers.get('content-type')
      const text3 = await res3.text()

      if (!contentType?.includes('application/json')) {
        throw new Error(
          `[POST /json] Expected content-type to include "application/json", got "${contentType}"`
        )
      }
      if (text3 !== body) {
        throw new Error(`[POST /json] Expected "${body}", got "${text3}"`)
      }

      console.log(`  ✅ Tests passed for ${name}`)
    } finally {
      // Kill server
      server.kill()
      await this.sleep(1000)
    }
  }

  async runHttpBenchmark(appPath: string, name: string): Promise<BenchmarkResult> {
    console.log(`⚡ Running HTTP benchmark for ${name}...`)

    // Bombardier commands adapted from bun-http-framework-benchmark
    // https://github.com/honojs/bun-http-framework-benchmark/blob/main/bench.ts
    const bodyFile = join(TEMP_DIR, 'body.json')
    const commands = [
      `bombardier --fasthttp -c ${CONFIG.concurrency} -d ${CONFIG.duration}s http://127.0.0.1:3000/`,
      `bombardier --fasthttp -c ${CONFIG.concurrency} -d ${CONFIG.duration}s http://127.0.0.1:3000/id/1?name=bun`,
      `bombardier --fasthttp -c ${CONFIG.concurrency} -d ${CONFIG.duration}s -m POST -H Content-Type:application/json -f ${bodyFile} http://127.0.0.1:3000/json`,
    ]

    const allRuns: number[][] = []

    for (let run = 0; run < CONFIG.runs; run++) {
      console.log(`  Run ${run + 1}/${CONFIG.runs}`)

      // Start server
      const server = spawn('bun', [appPath], {
        cwd: TEMP_DIR,
        env: { ...process.env, NODE_ENV: 'production' },
      })

      // Wait for server to start
      await this.sleep(1000)

      const runResults: number[] = []

      try {
        for (let i = 0; i < commands.length; i++) {
          const command = commands[i]

          const result = await this.runCommand(command, process.cwd())
          console.log(result.stdout)

          const match = result.stdout.match(/Reqs\/sec\s+(\d+[.|,]\d+)/)

          if (match) {
            const score = parseFloat(match[1].replace(',', ''))
            runResults.push(score)
          } else {
            console.log('      ❌ Failed to parse result')
            runResults.push(0)
          }
        }
      } finally {
        // Kill server
        server.kill()
        await this.sleep(500)
      }

      allRuns.push(runResults)
    }

    // Calculate averages
    const avgPing = this.average(allRuns.map((run) => run[0]))
    const avgQuery = this.average(allRuns.map((run) => run[1]))
    const avgBody = this.average(allRuns.map((run) => run[2]))
    const overall = (avgPing + avgQuery + avgBody) / 3

    return {
      name,
      average: overall,
      ping: avgPing,
      query: avgQuery,
      body: avgBody,
      runs: allRuns.map((run) => (run[0] + run[1] + run[2]) / 3),
    }
  }

  private async runCommand(command: string, cwd: string) {
    const parts = command.split(' ')
    const proc = spawn(parts[0], parts.slice(1), { cwd })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stdout = await new Response(proc.stdout as any).text()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stderr = await new Response(proc.stderr as any).text()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (proc as any).exited

    if (result !== 0 && result !== null && result !== undefined) {
      console.error(`Command failed: ${command}`)
      console.error(`Exit code: ${result}`)
      console.error(`Stdout: ${stdout}`)
      console.error(`Stderr: ${stderr}`)
      throw new Error(`Command failed: ${command}`)
    }

    return { stdout, stderr }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private average(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length
  }

  async cleanup() {
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true })
    }
  }
}

async function main() {
  console.log('🏁 Hono HTTP Benchmark')
  console.log('======================')
  console.log(`Baseline: ${CONFIG.baseline}`)
  console.log(`Target: ${CONFIG.target}`)
  console.log(`Runs: ${CONFIG.runs}`)
  console.log(`Duration: ${CONFIG.duration}s`)
  console.log(`Concurrency: ${CONFIG.concurrency}`)
  console.log('')

  const runner = new BenchmarkRunner()

  try {
    // Build both versions
    const baselinePath = await runner.buildVersion(CONFIG.baseline, 'baseline')
    const targetPath = await runner.buildVersion(CONFIG.target, 'target')

    // Run HTTP benchmarks
    const baselineResult = await runner.runHttpBenchmark(baselinePath, 'baseline')
    const targetResult = await runner.runHttpBenchmark(targetPath, 'target')

    // Calculate performance difference
    const perfDiff = (
      ((targetResult.average - baselineResult.average) / baselineResult.average) *
      100
    ).toFixed(2)

    // Output results
    console.log('')
    console.log('|  Framework       | Runtime | Average | Ping       | Query      | Body       |')
    console.log('| ---------------- | ------- | ------- | ---------- | ---------- | ---------- |')
    console.log(
      `| hono (${CONFIG.baseline}) | bun | ${baselineResult.average.toFixed(
        3
      )} | ${baselineResult.ping.toFixed(2)} | ${baselineResult.query.toFixed(
        2
      )} | ${baselineResult.body.toFixed(2)} |`
    )
    console.log(
      `| hono (${CONFIG.target}) | bun | ${targetResult.average.toFixed(
        3
      )} | ${targetResult.ping.toFixed(2)} | ${targetResult.query.toFixed(
        2
      )} | ${targetResult.body.toFixed(2)} |`
    )
    console.log('')
    console.log(`Performance change: ${Number(perfDiff) >= 0 ? '+' : ''}${perfDiff}%`)

    // Save results for CI
    const results = {
      performance: {
        baseline: baselineResult,
        target: targetResult,
        improvement: parseFloat(perfDiff),
      },
    }

    writeFileSync('benchmark-results.json', JSON.stringify(results, null, 2))
    console.log('')
    console.log('💾 Results saved to benchmark-results.json')
  } catch (error) {
    console.error('❌ Benchmark failed:', error)
    throw error
  } finally {
    await runner.cleanup()
  }
}

// Run if this file is executed directly
main()