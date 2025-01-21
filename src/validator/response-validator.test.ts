import { Hono } from '../preset/quick'
import { responseValidator } from '.'

const app = new Hono()

app
  .use(
    '*',
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
