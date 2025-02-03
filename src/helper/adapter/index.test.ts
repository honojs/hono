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
    it('Should not throw type errors', () => {
      const app = new Hono()

      app.get('/var', (c) => {
        const { MY_VAR } = env<{ MY_VAR: string }>(c)
        return c.json({
          var: MY_VAR,
        })
      })
    })

    it('Should not throw type errors with explicit Env', () => {
      type Env = {
        Bindings: {
          MY_VAR: string
        }
      }
      const app = new Hono<Env>()

      app.get('/var', (c) => {
        const { MY_VAR } = env<{ MY_VAR: string }>(c)
        return c.json({
          var: MY_VAR,
        })
      })
    })
  })
})
