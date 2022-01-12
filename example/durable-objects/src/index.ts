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

export class Counter {
  value: number = 0
  state: DurableObjectState
  app: Hono

  constructor(state: DurableObjectState) {
    this.state = state
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage?.get<number>('value')
      this.value = stored || 0
    })

    let currentValue = this.value

    this.app = new Hono()

    this.app.get('/increment', async c => {
      currentValue = ++this.value
      await this.state.storage?.put('value', this.value)
      return c.text(currentValue.toString())
    })

    this.app.get('/decrement', async c => {
      currentValue = --this.value
      await this.state.storage?.put('value', this.value)
      return c.text(currentValue.toString())
    })

    this.app.get('/', async c => {
      return c.text(currentValue.toString())
    })
  }

  async fetch(request: Request) {
    return this.app.dispatch(request)
  }
}
