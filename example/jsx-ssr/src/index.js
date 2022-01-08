import { Hono } from '../../../dist/index'

import { renderSSR } from 'nano-jsx'
import { initSSR } from 'nano-jsx/lib/ssr'
import { App } from './app'

initSSR()

const app = new Hono()

app.get('/', (c) => {
  const body = renderSSR(<App />)
  return c.html(body)
})

app.fire()
