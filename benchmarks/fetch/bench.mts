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
//   HONO_CASE   ... run only cases whose name starts with this prefix (e.g. "ping")
//
// Runs on both Bun and Node.
import './ts-resolve.mjs'
import { run, bench, measure } from 'mitata'
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
    .get('/user', (c: any) => c.json({ id: 123, name: 'Alice', roles: ['admin', 'editor'] }))
    .use('/mw/*', async (_c: any, next: any) => {
      await next()
    })
    .get('/mw/hello', (c: any) => c.text('mw'))
    .use('/hdr/*', async (c: any, next: any) => {
      await next()
      c.header('x-response-time', '3ms')
      c.header('x-served-by', 'benchmark')
    })
    .get('/hdr/hello', (c: any) => c.text('hdr'))
  return app
}

const app = await makeApp(src)

const ping = new Request('http://localhost/')
const query = new Request('http://localhost/id/1?name=bun')
const user = new Request('http://localhost/user')
const mw = new Request('http://localhost/mw/hello')
const hdr = new Request('http://localhost/hdr/hello')

let sink: unknown

const caseFilter = process.env.HONO_CASE

const allCases: [string, (app: any) => Promise<unknown>][] = [
  ['ping GET /', (app) => app.fetch(ping)],
  ['query GET /id/1?name=bun', (app) => app.fetch(query)],
  ['json GET /user', (app) => app.fetch(user)],
  ['middleware GET /mw/hello', (app) => app.fetch(mw)],
  ['post-mw headers GET /hdr/hello', (app) => app.fetch(hdr)],
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

const cases = caseFilter ? allCases.filter(([name]) => name.startsWith(caseFilter)) : allCases
if (cases.length === 0) {
  throw new Error(`no cases match HONO_CASE=${caseFilter}`)
}

// Warm up before registering benches: the first fetch builds the router
// lazily (>500µs), which makes mitata skip batching for the first bench.
for (const [, fn] of allCases) {
  sink = await fn(app)
}

for (const [name, fn] of cases) {
  bench(name, async () => {
    sink = await fn(app)
  })
}

if (asJson) {
  // Force batching on: without it, each iteration is timed individually at
  // timer granularity (~41ns on Apple Silicon), which is too coarse here.
  const results: Record<string, { avg: number; min: number; p75: number }> = {}
  for (const [name, fn] of cases) {
    const stats = await measure(
      async () => {
        sink = await fn(app)
      },
      {
        warmup_threshold: Number.MAX_SAFE_INTEGER,
        batch_threshold: Number.MAX_SAFE_INTEGER,
      }
    )
    // p50 rather than avg: insensitive to the slow JIT tier-up windows
    results[name] = { avg: stats.p50, min: stats.min, p75: stats.p75 }
  }
  console.log(JSON.stringify({ label, cases: results }))
  console.error(typeof sink)
} else {
  console.log(`benchmarking: ${label} (${src})`)
  await run()
  console.log(typeof sink)
}
