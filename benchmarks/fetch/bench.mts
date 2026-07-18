// Measure app.fetch() overhead in-process.
//
//   bun bench.mts / node bench.mts   ... benchmark the working tree
//   ./compare.sh [ref]               ... also benchmark <ref> and compare
//
// Each invocation benchmarks a single variant so that results are not
// affected by same-process JIT/GC order effects. compare.sh spawns one
// process per variant per round and aggregates the results.
//
// Env:
//   HONO_SRC    ... path to the hono `src` directory to benchmark (default: ../../src)
//   HONO_LABEL  ... label used in the output (default: hono)
//   HONO_JSON=1 ... suppress mitata output and print a single JSON line instead
//
// Runs on both Bun and Node.
import './ts-resolve.mjs'
import { run, bench } from 'mitata'
import { fileURLToPath, pathToFileURL } from 'node:url'

const src = process.env.HONO_SRC ?? fileURLToPath(new URL('../../src', import.meta.url))
const label = process.env.HONO_LABEL ?? 'hono'
const asJson = process.env.HONO_JSON === '1'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeApp = async (src: string): Promise<any> => {
  const { Hono } = await import(pathToFileURL(`${src}/index.ts`).href)
  const { RegExpRouter } = await import(pathToFileURL(`${src}/router/reg-exp-router/index.ts`).href)

  const app = new Hono({ router: new RegExpRouter() })
  /* eslint-disable @typescript-eslint/no-explicit-any */
  app
    .get('/', (c: any) => c.text('Hi'))
    .post('/json', (c: any) => c.req.json().then(c.json))
    .get('/id/:id', (c: any) => {
      const id = c.req.param('id')
      const name = c.req.query('name')
      c.header('x-powered-by', 'benchmark')
      return c.text(`${id} ${name}`)
    })
  return app
}

const app = await makeApp(src)

const ping = new Request('http://localhost/')
const query = new Request('http://localhost/id/1?name=bun')

let sink: unknown

 
const cases: [string, (app: any) => Promise<unknown>][] = [
  ['ping GET /', (app) => app.fetch(ping)],
  ['query GET /id/1?name=bun', (app) => app.fetch(query)],
  [
    'body POST /json',
    (app) =>
      app.fetch(
        new Request('http://localhost/json', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{"hello":"world"}',
        })
      ),
  ],
]

for (const [name, fn] of cases) {
  bench(name, async () => {
    sink = await fn(app)
  })
}

if (asJson) {
  const { benchmarks } = await run({ format: 'quiet' })
  const results: Record<string, { avg: number; min: number; p75: number }> = {}
  for (const b of benchmarks) {
    const { stats, error } = b.runs[0]
    if (error || !stats) {
      throw error ?? new Error(`no stats for ${b.alias}`)
    }
    results[b.alias] = { avg: stats.avg, min: stats.min, p75: stats.p75 }
  }
  console.log(JSON.stringify({ label, cases: results }))
  console.error(typeof sink)
} else {
  console.log(`benchmarking: ${label} (${src})`)
  await run()
  console.log(typeof sink)
}
