/** @jsxImportSource ../../deno_dist/jsx */
import { Style, css } from '../../deno_dist/helper/css/index.ts'
import { Suspense, renderToReadableStream } from '../../deno_dist/jsx/streaming.ts'
import type { HtmlEscapedString } from '../../deno_dist/utils/html.ts'
import { resolveCallback, HtmlEscapedCallbackPhase } from '../../deno_dist/utils/html.ts'
import { assertEquals } from '../deno/deps.ts'

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
