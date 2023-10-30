import type { HtmlEscapedString } from '../utils/html'
import { Suspense, use, renderToReadableStream } from './streaming'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx } from './index'

describe('Streaming', () => {
  it('Suspense / use / renderToReadableStream', async () => {
    const delayedContent = new Promise<HtmlEscapedString>((resolve) =>
      setTimeout(() => resolve(<h1>Hello</h1>), 10)
    )
    const Content = () => {
      const content = use(delayedContent)
      return content
    }

    const stream = renderToReadableStream(
      <Suspense fallback={<p>Loading...</p>}>
        <Content />
      </Suspense>
    )

    const chunks = []
    const textDecoder = new TextDecoder
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks).toEqual([
      '<template id="H:0"></template><p>Loading...</p>',
      `<template><h1>Hello</h1></template><script>
((d, c) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:0')
d.nextElementSibling.remove()
d.replaceWith(c.content)
})(document)
</script>`,
    ])
  })
})
