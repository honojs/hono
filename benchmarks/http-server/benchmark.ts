/**
 * Hono HTTP Performance Benchmark
 *
 * Inspired by https://github.com/SaltyAom/bun-http-framework-benchmark
 *
 * Usage:
 *   bun run benchmark.ts [options]
 *
 * Options:
 *   --baseline=<ref>    Git reference for baseline (default: main)
 *   --target=<ref>      Git reference for target (default: current)
 *   --runs=<number>     Number of benchmark runs (default: 1)
 *   --duration=<number> Duration of each test in seconds (default: 10)
 *   --skip-tests        Skip endpoint validation tests
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

// Configuration from command line arguments
const baseline = process.argv.find((arg) => arg.startsWith('--baseline='))?.split('=')[1] || 'origin/main'
const target = process.argv.find((arg) => arg.startsWith('--target='))?.split('=')[1] || 'current'
const runs = parseInt(process.argv.find((arg) => arg.startsWith('--runs='))?.split('=')[1] || '1')
const duration = parseInt(
  process.argv.find((arg) => arg.startsWith('--duration='))?.split('=')[1] || '10'
)
const concurrency = 500
const skipTests = process.argv.includes('--skip-tests')

const SCRIPT_DIR = import.meta.dirname
const TEMP_DIR = join(SCRIPT_DIR, '.benchmark-temp')
const HONO_ROOT = join(SCRIPT_DIR, '../..')

// Test app template (embedded to avoid file dependency issues)
const getAppTemplate = () => `import { Hono } from './src/index.ts'
import { RegExpRouter } from './src/router/reg-exp-router/index.ts'

const app = new Hono({ router: new RegExpRouter() })

app
  .get('/', (c) => c.text('Hi'))
  .post('/json', (c) => c.req.json().then(c.json))
  .get('/id/:id', (c) => {
    const id = c.req.param('id')
    const name = c.req.query('name')
    c.header('x-powered-by', 'benchmark')
    return c.text(\`\${id} \${name}\`)
  })

export default app`

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const runCommand = async (command: string, cwd: string) => {
  const parts = command.split(' ')
  const proc = spawn(parts[0], parts.slice(1), { cwd })

  let stdout = ''
  let stderr = ''

  proc.stdout.on('data', (data) => {
    stdout += data
  })
  proc.stderr.on('data', (data) => {
    stderr += data
  })

  const exitCode = await new Promise<number>((resolve) => {
    proc.on('close', resolve)
  })

  if (exitCode !== 0) {
    console.error(`Command failed: ${command}`)
    console.error(`Exit code: ${exitCode}`)
    console.error(`Stdout: ${stdout}`)
    console.error(`Stderr: ${stderr}`)
    throw new Error(`Command failed: ${command}`)
  }

  return { stdout, stderr }
}

const setupTemp = () => {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true })
  }
  mkdirSync(TEMP_DIR, { recursive: true })
  writeFileSync(join(TEMP_DIR, 'body.json'), '{"hello":"world"}')
}

const buildVersion = async (version: string, name: string) => {
  console.log(`📦 Preparing ${name} (${version})...`)

  let needsRestore = false
  let stashRef = ''

  if (version === 'current') {
    // No build needed - use src directly
  } else {
    // Ensure we have the latest remote refs
    await runCommand('git fetch origin', HONO_ROOT)

    try {
      const stashResult = await runCommand('git stash push -m "benchmark-temp"', HONO_ROOT)
      needsRestore = stashResult.stdout.includes('Saved working directory')
      if (needsRestore) {
        stashRef = 'stash@{0}'
      }
    } catch {
      // No changes to stash
    }

    await runCommand(`git checkout ${version}`, HONO_ROOT)
    await runCommand('bun install', HONO_ROOT)
    // No build needed - use src directly
  }

  const versionDir = join(TEMP_DIR, name)
  mkdirSync(versionDir, { recursive: true })
  await runCommand(`cp -r ${HONO_ROOT}/src ${versionDir}/src`, process.cwd())

  const appPath = join(versionDir, 'app.ts')
  writeFileSync(appPath, getAppTemplate())

  // Test endpoints (optional)
  if (!skipTests) {
    console.log(`🧪 Testing endpoints for ${name}...`)
    const server = spawn('bun', [appPath], {
      cwd: TEMP_DIR,
      env: { ...process.env, NODE_ENV: 'production' },
    })
    await sleep(2000)

    try {
      const res1 = await fetch('http://127.0.0.1:3000/')
      if ((await res1.text()) !== 'Hi') {
        throw new Error('[GET /] test failed')
      }

      const res2 = await fetch('http://127.0.0.1:3000/id/1?name=bun')
      if (res2.headers.get('x-powered-by') !== 'benchmark' || (await res2.text()) !== '1 bun') {
        throw new Error('[GET /id/:id] test failed')
      }

      const body = JSON.stringify({ hello: 'world' })
      const res3 = await fetch('http://127.0.0.1:3000/json', {
        method: 'POST',
        body,
        headers: { 'content-type': 'application/json', 'content-length': body.length.toString() },
      })
      if (
        !res3.headers.get('content-type')?.includes('application/json') ||
        (await res3.text()) !== body
      ) {
        throw new Error('[POST /json] test failed')
      }

      console.log(`  ✅ Tests passed for ${name}`)
    } finally {
      server.kill()
      await sleep(1000)
    }
  } else {
    console.log(`  ⏭️ Skipping endpoint tests for ${name}`)
  }

  // Restore git state
  if (version !== 'current' && needsRestore) {
    await runCommand('git checkout -', HONO_ROOT)
    await runCommand(`git stash pop ${stashRef}`, HONO_ROOT)
  } else if (version !== 'current') {
    await runCommand('git checkout -', HONO_ROOT)
  }

  return appPath
}

const runBenchmark = async (appPath: string, name: string) => {
  console.log(`⚡ Running HTTP benchmark for ${name}...`)

  const bodyFile = join(TEMP_DIR, 'body.json')
  const commands = [
    `bombardier --fasthttp -c ${concurrency} -d ${duration}s http://127.0.0.1:3000/`,
    `bombardier --fasthttp -c ${concurrency} -d ${duration}s http://127.0.0.1:3000/id/1?name=bun`,
    `bombardier --fasthttp -c ${concurrency} -d ${duration}s -m POST -H Content-Type:application/json -f ${bodyFile} http://127.0.0.1:3000/json`,
  ]

  const allRuns: number[][] = []

  for (let run = 0; run < runs; run++) {
    console.log(`  Run ${run + 1}/${runs}`)

    const server = spawn('bun', [appPath], {
      cwd: TEMP_DIR,
      env: { ...process.env, NODE_ENV: 'production' },
    })
    await sleep(1000)

    const runResults: number[] = []

    try {
      for (const command of commands) {
        const result = await runCommand(command, process.cwd())
        console.log(result.stdout)

        const match = result.stdout.match(/Reqs\/sec\s+(\d+[.|,]\d+)/)
        if (match) {
          runResults.push(parseFloat(match[1].replace(',', '')))
        } else {
          console.log('❌ Failed to parse result')
          runResults.push(0)
        }
      }
    } finally {
      server.kill()
      await sleep(500)
    }

    allRuns.push(runResults)
  }

  const average = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

  const ping = average(allRuns.map((run) => run[0]))
  const query = average(allRuns.map((run) => run[1]))
  const body = average(allRuns.map((run) => run[2]))
  const overall = (ping + query + body) / 3

  return { name, average: overall, ping, query, body, runs: allRuns.map((run) => average(run)) }
}

const main = async () => {
  console.log('🏁 Hono HTTP Benchmark')
  console.log('======================')
  console.log(`Baseline: ${baseline}`)
  console.log(`Target: ${target}`)
  console.log(`Runs: ${runs}`)
  console.log(`Duration: ${duration}s`)
  console.log(`Concurrency: ${concurrency}`)
  console.log(`Skip Tests: ${skipTests}`)
  console.log('')

  setupTemp()

  try {
    // Compare baseline vs target
    const baselinePath = await buildVersion(baseline, 'baseline')
    const targetPath = await buildVersion(target, 'target')

    const baselineResult = await runBenchmark(baselinePath, 'baseline')
    const targetResult = await runBenchmark(targetPath, 'target')

    // Calculate changes
    const calculateChange = (target: number, baseline: number) =>
      (((target - baseline) / baseline) * 100).toFixed(2)

    const changes = {
      average: calculateChange(targetResult.average, baselineResult.average),
      ping: calculateChange(targetResult.ping, baselineResult.ping),
      query: calculateChange(targetResult.query, baselineResult.query),
      body: calculateChange(targetResult.body, baselineResult.body),
    }

    // Format numbers
    const format = (num: number) => num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const formatChange = (change: string) => (Number(change) >= 0 ? '+' : '') + change + '%'

    // Generate table data
    const rows = [
      {
        framework: `hono (${baseline})`,
        runtime: 'bun',
        average: format(baselineResult.average),
        ping: format(baselineResult.ping),
        query: format(baselineResult.query),
        body: format(baselineResult.body),
      },
      {
        framework: `hono (${target})`,
        runtime: 'bun',
        average: format(targetResult.average),
        ping: format(targetResult.ping),
        query: format(targetResult.query),
        body: format(targetResult.body),
      },
      {
        framework: 'Change',
        runtime: '',
        average: formatChange(changes.average),
        ping: formatChange(changes.ping),
        query: formatChange(changes.query),
        body: formatChange(changes.body),
      },
    ]

    const table = [
      '| Framework | Runtime | Average | Ping | Query | Body |',
      '| --- | --- | --- | --- | --- | --- |',
      ...rows.map(
        (row) =>
          `| ${row.framework} | ${row.runtime} | ${row.average} | ${row.ping} | ${row.query} | ${row.body} |`
      ),
    ]

    // Console output
    console.log('')
    table.forEach((line) => console.log(line))
    console.log('')

    // Markdown output
    const markdownOutput = ['## HTTP Performance Benchmark', '', ...table].join('\n')

    writeFileSync(join(SCRIPT_DIR, 'benchmark-results.md'), markdownOutput)
  } catch (error) {
    console.error('❌ Benchmark failed:', error)
    throw error
  } finally {
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true })
    }
  }
}

main()
