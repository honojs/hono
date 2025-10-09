import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { parseArgs } from 'node:util'
import { proxy } from '../src/helper/proxy'
import { Hono } from '../src/hono'
import { basicAuth } from '../src/middleware/basic-auth'
import { logger } from '../src/middleware/logger'
// import all the middleware and helpers
;[basicAuth, logger, serveStatic, proxy].forEach((f) => {
  if (typeof f === 'function') {
    // useless process to avoid being deleted by bundler
  }
})

const { values } = parseArgs({
  options: {
    port: { type: 'string' },
    use: { type: 'string', multiple: true },
  },
})

const app = new Hono()

values.use?.forEach((use) => {
  app.use(async (c, next) => {
    const evalRes = eval(use)
    return typeof evalRes === 'function' ? evalRes(c, next) : evalRes
  })
})

serve(
  {
    fetch: app.fetch,
    port: values.port ? Number.parseInt(values.port) : undefined,
  },
  (info) => {
    console.log(`Listening on http://localhost:${info.port}`)
  }
)
