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
const ciMode = process.argv.includes('--ci')
const baseline = process.argv.find((arg) => arg.startsWith('--baseline='))?.split('=')[1] || 'main'
const target = process.argv.find((arg) => arg.startsWith('--target='))?.split('=')[1] || 'current'
const runs = parseInt(process.argv.find((arg) => arg.startsWith('--runs='))?.split('=')[1] || '1')
const duration = parseInt(
  process.argv.find((arg) => arg.startsWith('--duration='))?.split('=')[1] || '10'
)
const concurrency = 500
const skipTests = process.argv.includes('--skip-tests')

const SCRIPT_DIR = join(import.meta.dirname, '..')
const TEMP_DIR = join(SCRIPT_DIR, '.benchmark-temp')
const HONO_ROOT = join(SCRIPT_DIR, '../..')

// Test app template (embedded to avoid file dependency issues)
const getAppTemplate = () => `import { Hono } from './dist/index.js'
import { RegExpRouter } from './dist/router/reg-exp-router/index.js'

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

const log = (...args: unknown[]) => {
  if (!ciMode) {
    console.log(...args)
  }
}

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
  log(`📦 Building ${name} (${version})...`)

  let needsRestore = false
  let stashRef = ''

  if (version === 'current') {
    if (!ciMode) {
      await runCommand('bun run build', HONO_ROOT)
    }
  } else {
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
    if (!ciMode) {
      await runCommand('bun run build', HONO_ROOT)
    }
  }

  const versionDir = join(TEMP_DIR, name)
  mkdirSync(versionDir, { recursive: true })
  await runCommand(`cp -r ${HONO_ROOT}/dist ${versionDir}/dist`, process.cwd())

  const appPath = join(versionDir, 'app.js')
  writeFileSync(appPath, getAppTemplate())

  // Test endpoints (optional)
  if (!skipTests) {
    log(`🧪 Testing endpoints for ${name}...`)
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

      log(`  ✅ Tests passed for ${name}`)
    } finally {
      server.kill()
      await sleep(1000)
    }
  } else {
    log(`  ⏭️ Skipping endpoint tests for ${name}`)
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
  log(`⚡ Running HTTP benchmark for ${name}...`)

  const bodyFile = join(TEMP_DIR, 'body.json')
  const commands = [
    `bombardier --fasthttp -c ${concurrency} -d ${duration}s http://127.0.0.1:3000/`,
    `bombardier --fasthttp -c ${concurrency} -d ${duration}s http://127.0.0.1:3000/id/1?name=bun`,
    `bombardier --fasthttp -c ${concurrency} -d ${duration}s -m POST -H Content-Type:application/json -f ${bodyFile} http://127.0.0.1:3000/json`,
  ]

  const allRuns: number[][] = []

  for (let run = 0; run < runs; run++) {
    log(`  Run ${run + 1}/${runs}`)

    const server = spawn('bun', [appPath], {
      cwd: TEMP_DIR,
      env: { ...process.env, NODE_ENV: 'production' },
    })
    await sleep(1000)

    const runResults: number[] = []

    try {
      for (const command of commands) {
        const result = await runCommand(command, process.cwd())
        log(result.stdout)

        const match = result.stdout.match(/Reqs\/sec\s+(\d+[.|,]\d+)/)
        if (match) {
          runResults.push(parseFloat(match[1].replace(',', '')))
        } else {
          log('❌ Failed to parse result')
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
  log('🏁 Hono HTTP Benchmark')
  log('======================')
  log(`Baseline: ${baseline}`)
  log(`Target: ${target}`)
  log(`Runs: ${runs}`)
  log(`Duration: ${duration}s`)
  log(`Concurrency: ${concurrency}`)
  log(`Skip Tests: ${skipTests}`)
  log('')

  setupTemp()

  try {
    if (ciMode) {
      // CI mode: measure current branch only (dist already built)
      const versionDir = join(TEMP_DIR, 'current')
      mkdirSync(versionDir, { recursive: true })
      const distPath = join(HONO_ROOT, 'dist')
      await runCommand(`cp -r ${distPath} ${versionDir}/`, process.cwd())

      const appPath = join(versionDir, 'app.js')
      writeFileSync(appPath, getAppTemplate())

      const targetResult = await runBenchmark(appPath, 'current')

      // Generate octocov-compatible output
      const benchmark = {
        key: 'speed-check',
        name: 'HTTP speed check',
        metrics: [
          {
            key: 'ping',
            name: 'Ping (req/s)',
            value: targetResult.ping,
            unit: 'req/s',
          },
          {
            key: 'query',
            name: 'Query (req/s)',
            value: targetResult.query,
            unit: 'req/s',
          },
          {
            key: 'body',
            name: 'Body (req/s)',
            value: targetResult.body,
            unit: 'req/s',
          },
          {
            key: 'average',
            name: 'Average (req/s)',
            value: targetResult.average,
            unit: 'req/s',
          },
        ],
      }

      console.log(JSON.stringify(benchmark, null, 2))
      return
    }

    // Normal mode: compare baseline vs target
    const baselinePath = await buildVersion(baseline, 'baseline')
    const targetPath = await buildVersion(target, 'target')

    const baselineResult = await runBenchmark(baselinePath, 'baseline')
    const targetResult = await runBenchmark(targetPath, 'target')

    // Calculate changes
    const overallChange = (
      ((targetResult.average - baselineResult.average) / baselineResult.average) *
      100
    ).toFixed(2)
    const pingChange = (
      ((targetResult.ping - baselineResult.ping) / baselineResult.ping) *
      100
    ).toFixed(2)
    const queryChange = (
      ((targetResult.query - baselineResult.query) / baselineResult.query) *
      100
    ).toFixed(2)
    const bodyChange = (
      ((targetResult.body - baselineResult.body) / baselineResult.body) *
      100
    ).toFixed(2)

    // Format output
    const baselineName = `hono (${baseline})`
    const targetName = `hono (${target})`
    const maxNameLength = Math.max(baselineName.length, targetName.length, 16)

    const formatName = (name: string) => name.padEnd(maxNameLength)
    const formatNumber = (num: number) => num.toFixed(2).padStart(10)
    const formatAverage = (num: number) => num.toFixed(3).padStart(7)
    const formatChange = (change: string) =>
      ((Number(change) >= 0 ? '+' : '') + change + '%').padStart(10)

    console.log('')
    console.log(
      `| ${'Framework'.padEnd(
        maxNameLength
      )} | Runtime | Average | Ping       | Query      | Body       |`
    )
    console.log(
      `| ${'-'.repeat(maxNameLength)} | ------- | ------- | ---------- | ---------- | ---------- |`
    )
    console.log(
      `| ${formatName(baselineName)} | bun     | ${formatAverage(
        baselineResult.average
      )} | ${formatNumber(baselineResult.ping)} | ${formatNumber(
        baselineResult.query
      )} | ${formatNumber(baselineResult.body)} |`
    )
    console.log(
      `| ${formatName(targetName)} | bun     | ${formatAverage(
        targetResult.average
      )} | ${formatNumber(targetResult.ping)} | ${formatNumber(
        targetResult.query
      )} | ${formatNumber(targetResult.body)} |`
    )
    console.log(
      `| ${' '.repeat(maxNameLength)} |         | ${(
        (Number(overallChange) >= 0 ? '+' : '') +
        overallChange +
        '%'
      ).padStart(7)} | ${formatChange(pingChange)} | ${formatChange(queryChange)} | ${formatChange(
        bodyChange
      )} |`
    )
    console.log('')

    // Individual changes summary
    console.log('📊 Performance Changes:')
    console.log(`   Overall: ${Number(overallChange) >= 0 ? '+' : ''}${overallChange}%`)
    console.log(`   Ping:    ${Number(pingChange) >= 0 ? '+' : ''}${pingChange}%`)
    console.log(`   Query:   ${Number(queryChange) >= 0 ? '+' : ''}${queryChange}%`)
    console.log(`   Body:    ${Number(bodyChange) >= 0 ? '+' : ''}${bodyChange}%`)
    console.log('')
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
