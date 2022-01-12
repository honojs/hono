import { Hono } from '../../../src/index'
import type  { Env } from '../../../src/index'

declare module '../../../src/index' {
  interface Env {
    COUNTER: DurableObjectNamespace
  }
}

const app = new Hono()

app.get('*', async c => {
  const id = c.env.COUNTER.idFromName('A')
  const obj = c.env.COUNTER.get(id)
  const resp = await obj.fetch(c.req.url)
  const count = parseInt(await resp.text())
  return c.text(`Count is ${count}`)
})

export default {
  fetch(request: Request, env: Env, event: FetchEvent) {
    return app.fetch(request, env, event)
  },
}


