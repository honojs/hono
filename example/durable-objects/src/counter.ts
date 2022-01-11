import { Hono } from '../../../src/index'

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

    this.app.get('/increment', async (c) => {
      currentValue = ++this.value
      await this.state.storage?.put('value', this.value)
      return c.text(currentValue.toString())
    })

    this.app.get('/decrement', async (c) => {
      currentValue = --this.value
      await this.state.storage?.put('value', this.value)
      return c.text(currentValue.toString())
    })

    this.app.get('/', async (c) => {
      return c.text(currentValue.toString())
    })
  }

  async fetch(request: Request) {
    return this.app.dispatch(request)
  }
}
