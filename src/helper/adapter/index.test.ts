import { Hono } from '../../hono'
import { env, getRuntimeKey } from '.'

describe('getRuntimeKey', () => {
  it('Should return the current runtime key', () => {
    // Now, using the `bun run test` command.
    // But `vitest` depending Node.js will run this test so the RuntimeKey will be `node`.
    expect(getRuntimeKey()).toBe('node')
  })
})

describe('env', () => {
  describe('Types', () => {
    type Env = {
      Bindings: {
        MY_VAR: string
      }
    }
    const app = new Hono<Env>()

    it('Should set the type of the Context correctly and not throw a type error')
    app.get('/var', (c) => {
      const { MY_VAR } = env<{ MY_VAR: string }>(c)
      return c.json({
        var: MY_VAR,
      })
    })
  })
})
