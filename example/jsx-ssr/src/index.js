import { Hono } from '../../../dist/index'

import { renderSSR } from 'nano-jsx'
import { initSSR } from 'nano-jsx/lib/ssr'
import { App } from './app'

initSSR()

const app = new Hono()

app.get('/', () => {
  const html = renderSSR(<App />)
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
})

app.fire()
