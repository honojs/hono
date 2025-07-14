import { Hono } from '../preset/quick'
import { validator, responseValidator } from '.'

const app = new Hono<{
  Bindings: {
    foo: string
  }
}>()

app
  .get(
    '*',
    validator('query', (value, c) => {
      console.log(value, c)
    }),
    responseValidator('text', (value, c) => {
      console.log(value)
      if (!/\d/.test(value)) {
        return c.text('Invalid!', 400)
      }
    })
  )
  .get('/', (c) => {
    return c.text(c.validate('hello world at ' + Date.now()))
  })
  .get('/invalid', (c) => {
    return c.text(c.validate('hello world at ' + NaN))
  })

export default app
