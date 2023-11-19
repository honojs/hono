/** @jsxImportSource ../../deno_dist/jsx */
import { Suspense, renderToReadableStream } from '../../deno_dist/jsx/streaming.ts'
import type { HtmlEscapedString } from '../../deno_dist/utils/html.ts'
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
  for await (const chunk of stream as any) {
    chunks.push(textDecoder.decode(chunk))
  }

  assertEquals(chunks, [
    '<template id="H:0"></template><p>Loading...</p><!--/$-->',
    `<template><h1>Hello</h1></template><script>
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
