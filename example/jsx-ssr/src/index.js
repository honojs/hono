import { Hono } from '../../../dist/index'

import Nano from 'nano-jsx'
import { App } from './App'

const app = new Hono()

const makeHTML = (body) => {
  return `
<!DOCTYPE html>
 <html>
  <body>
    ${body}
  </body>
</html>
`
}

app.get('/', (c) => {
  const body = Nano.renderSSR(<App />)
  const html = makeHTML(body)
  return c.html(html)
})

app.fire()
