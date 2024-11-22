/** @jsxImportSource ../../src/jsx */
import { assertEquals } from '@std/assert'
import { Style, css } from '../../src/helper/css/index.ts'
import { Suspense, renderToReadableStream } from '../../src/jsx/streaming.ts'
import type { HtmlEscapedString } from '../../src/utils/html.ts'
import { HtmlEscapedCallbackPhase, resolveCallback } from '../../src/utils/html.ts'

Deno.test('JSX', () => {
  const Component = ({ name }: { name: string }) => <span>{name}</span>
  const html = (
    <div>
      <h1 id={'<Hello>'}>
        <Component name={'<Hono>'} />
      </h1>
    </div>
  )

  assertEquals(html.toString(), '<div><h1 id="&lt;Hello&gt;"><span>&lt;Hono&gt;</span></h1></div>')
})

Deno.test('JSX: Fragment', () => {
  const fragment = (
    <>
      <p>1</p>
      <p>2</p>
    </>
  )
  assertEquals(fragment.toString(), '<p>1</p><p>2</p>')
})

Deno.test('JSX: Empty Fragment', () => {
  const Component = () => <></>
  const html = <Component />
  assertEquals(html.toString(), '')
})

Deno.test('JSX: Async Component', async () => {
  const Component = async ({ name }: { name: string }) =>
    new Promise<HtmlEscapedString>((resolve) => setTimeout(() => resolve(<span>{name}</span>), 10))
  const stream = renderToReadableStream(
    <div>
      <Component name={'<Hono>'} />
    </div>
  )

  const chunks: string[] = []
  const textDecoder = new TextDecoder()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const chunk of stream as any) {
    chunks.push(textDecoder.decode(chunk))
  }

  assertEquals(chunks.join(''), '<div><span>&lt;Hono&gt;</span></div>')
})

Deno.test('JSX: Suspense', async () => {
  const Content = () => {
    const content = new Promise<HtmlEscapedString>((resolve) =>
      setTimeout(() => resolve(<h1>Hello</h1>), 10)
    )
    return content
  }

  const stream = renderToReadableStream(
    <Suspense fallback={<p>Loading...</p>}>
      <Content />
    </Suspense>
  )

  const chunks: string[] = []
  const textDecoder = new TextDecoder()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const chunk of stream as any) {
    chunks.push(textDecoder.decode(chunk))
  }

  assertEquals(chunks, [
    '<template id="H:0"></template><p>Loading...</p><!--/$-->',
    `<template data-hono-target="H:0"><h1>Hello</h1></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:0')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
  ])
})

Deno.test('JSX: css', async () => {
  const className = css`
    color: red;
  `
  const html = (
    <html>
      <head>
        <Style />
      </head>
      <body>
        <div class={className}></div>
      </body>
    </html>
  )

  const awaitedHtml = await html
  const htmlEscapedString = 'callbacks' in awaitedHtml ? awaitedHtml : await awaitedHtml.toString()
  assertEquals(
    await resolveCallback(htmlEscapedString, HtmlEscapedCallbackPhase.Stringify, false, {}),
    '<html><head><style id="hono-css">.css-3142110215{color:red}</style></head><body><div class="css-3142110215"></div></body></html>'
  )
})

Deno.test('JSX: css with CSP nonce', async () => {
  const className = css`
    color: red;
  `
  const html = (
    <html>
      <head>
        <Style nonce='1234' />
      </head>
      <body>
        <div class={className}></div>
      </body>
    </html>
  )

  const awaitedHtml = await html
  const htmlEscapedString = 'callbacks' in awaitedHtml ? awaitedHtml : await awaitedHtml.toString()
  assertEquals(
    await resolveCallback(htmlEscapedString, HtmlEscapedCallbackPhase.Stringify, false, {}),
    '<html><head><style id="hono-css" nonce="1234">.css-3142110215{color:red}</style></head><body><div class="css-3142110215"></div></body></html>'
  )
})

Deno.test('JSX: normalize key', async () => {
  const className = <div className='foo'></div>
  const htmlFor = <div htmlFor='foo'></div>
  const crossOrigin = <div crossOrigin='foo'></div>
  const httpEquiv = <div httpEquiv='foo'></div>
  const itemProp = <div itemProp='foo'></div>
  const fetchPriority = <div fetchPriority='foo'></div>
  const noModule = <div noModule='foo'></div>
  const formAction = <div formAction='foo'></div>

  assertEquals(className.toString(), '<div class="foo"></div>')
  assertEquals(htmlFor.toString(), '<div for="foo"></div>')
  assertEquals(crossOrigin.toString(), '<div crossorigin="foo"></div>')
  assertEquals(httpEquiv.toString(), '<div http-equiv="foo"></div>')
  assertEquals(itemProp.toString(), '<div itemprop="foo"></div>')
  assertEquals(fetchPriority.toString(), '<div fetchpriority="foo"></div>')
  assertEquals(noModule.toString(), '<div nomodule="foo"></div>')
  assertEquals(formAction.toString(), '<div formaction="foo"></div>')
})

Deno.test('JSX: null or undefined', async () => {
  const nullHtml = <div className={null}></div>
  const undefinedHtml = <div className={undefined}></div>

  // react-jsx : <div>
  // precompile : <div > // Extra whitespace is allowed because it is a specification.

  assertEquals(nullHtml.toString().replace(/\s+/g, ''), '<div></div>')
  assertEquals(undefinedHtml.toString().replace(/\s+/g, ''), '<div></div>')
})

Deno.test('JSX: boolean attributes', async () => {
  const trueHtml = <div disabled={true}></div>
  const falseHtml = <div disabled={false}></div>

  // output is different, but semantics as HTML is the same, so both are OK
  // react-jsx : <div disabled="">
  // precompile : <div disabled>

  assertEquals(trueHtml.toString().replace('=""', ''), '<div disabled></div>')
  assertEquals(falseHtml.toString(), '<div></div>')
})

Deno.test('JSX: number', async () => {
  const html = <div tabindex={1}></div>

  assertEquals(html.toString(), '<div tabindex="1"></div>')
})

Deno.test('JSX: style', async () => {
  const html = <div style={{ fontSize: '12px', color: null }}></div>
  assertEquals(html.toString(), '<div style="font-size:12px"></div>')
})
