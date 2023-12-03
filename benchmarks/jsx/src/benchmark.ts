import { Suite } from 'benchmark'
import { parse } from 'node-html-parser'

import { render as renderHono } from './hono'
import { render as renderNano } from './nano'
import { render as renderPreact } from './preact'
import { render as renderReact } from './react'

const suite = new Suite()

;[renderHono, renderReact, renderPreact, renderNano].forEach((render) => {
  const html = render()
  const doc = parse(html)
  if (doc.querySelector('p#c').textContent !== '3\nc') {
    throw new Error('Invalid output')
  } 
})

suite
  .add('Hono', () => {
    renderHono()
  })
  .add('React', () => {
    renderReact()
  })
  .add('Preact', () => {
    renderPreact()
  })
  .add('Nano', () => {
    renderNano()
  })
  .on('cycle', (ev) => {
    console.log(String(ev.target))
  })
  .on('complete', (ev) => {
    console.log(`Fastest is ${ev.currentTarget.filter('fastest').map('name')}`)
  })
  .run({ async: true })
