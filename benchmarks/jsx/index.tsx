import Benchmark from 'benchmark'

import Nano, { Fragment as NanoFragment } from 'nano-jsx'
import * as Preact from 'preact'
import { render as renderByPreact } from 'preact-render-to-string'
import React from 'react'
import { renderToString as renderByReact } from 'react-dom/server'

import * as HonoJSX from '../../src/middleware/jsx'

const buildPage = ({ jsx, Fragment }: { jsx: any; Fragment: any }) => {
  const Content = () => (
    <>
      <p id='a' class='class-name'>
        1<br />a
      </p>
      <p id='b' class='class-name'>
        2<br />b
      </p>
      <div dangerouslySetInnerHTML={{ __html: '<p id="c" class="class-name">3<br/>c</p>' }} />
      {null}
      {undefined}
    </>
  )

  const Form = () => (
    <form>
      <input type='text' value='a' readonly tabindex={1} />
      <input type='checkbox' value='b' checked={true} tabindex={2} />
      <input type='checkbox' value='c' checked={true} tabindex={3} />
      <input type='checkbox' value='d' checked={false} tabindex={4} />
      <input type='checkbox' value='e' checked={false} tabindex={5} />
    </form>
  )

  return () => (
    <html>
      <body>
        <Content />
        <Form />
      </body>
    </html>
  )
}

const PageByHonoJSX = buildPage(HonoJSX)
const PageByReact = buildPage({ jsx: React.createElement, Fragment: React.Fragment })
const PageByNano = buildPage({ jsx: Nano.h, Fragment: NanoFragment })
const PageByPreact = buildPage({ jsx: Preact.h, Fragment: Preact.Fragment })

const suite = new Benchmark.Suite()

suite
  .add('Hono', () => {
    PageByHonoJSX().toString()
  })
  .add('React', () => {
    renderByReact(PageByReact())
  })
  .add('Preact', () => {
    renderByPreact(PageByPreact())
  })
  .add('Nano', () => {
    Nano.renderSSR(PageByNano)
  })
  .on('cycle', (ev: any) => {
    console.log(String(ev.target))
  })
  .on('complete', (ev: any) => {
    console.log(`Fastest is ${ev.currentTarget.filter('fastest').map('name')}`)
  })
  .run({ async: true })
