// Measure app.fetch() overhead in-process.
//
//   bun bench.mts / node bench.mts   ... benchmark the working tree
//   ./compare.sh [ref]               ... also benchmark <ref> and compare
//
// Runs on both Bun and Node.
import './ts-resolve.mjs'
import { run, bench, group, summary } from 'mitata'
import { pathToFileURL } from 'node:url'

const devSrc = new URL('../../src', import.meta.url).pathname
const baseSrc = process.env.HONO_BASE_SRC
const baseRef = process.env.HONO_BASE_REF ?? 'base'

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

 
const apps: Record<string, any> = {}
if (baseSrc) {
  apps[baseRef] = await makeApp(baseSrc)
}
apps[baseSrc ? 'dev (working tree)' : 'hono'] = await makeApp(devSrc)

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
  group(name, () => {
    summary(() => {
      for (const [label, app] of Object.entries(apps)) {
        bench(label, async () => {
          sink = await fn(app)
        })
      }
    })
  })
}

await run()
console.log(typeof sink)
