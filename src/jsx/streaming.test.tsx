import { JSDOM } from 'jsdom'
import type { HtmlEscapedString } from '../utils/html'
import { Suspense, use, renderToReadableStream } from './streaming'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, Fragment } from './index'

function replacementResult(html: string) {
  const document = new JSDOM(html, { runScripts: 'dangerously' }).window.document
  document.querySelectorAll('template, script').forEach((e) => e.remove())
  return document.body.innerHTML
}

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
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks).toEqual([
      '<template id="H:0"></template><p>Loading...</p><!--/$-->',
      `<template><h1>Hello</h1></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:0')
while(n=d.nextSibling){n.remove();if(n.nodeType===8&&n.nodeValue==='/$')break}
d.replaceWith(c.content)
})(document)
</script>`,
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<h1>Hello</h1>'
    )
  })

  it('Multiple calls to "use"', async () => {
    const delayedContent = new Promise<HtmlEscapedString>((resolve) =>
      setTimeout(() => resolve(<h1>Hello</h1>), 10)
    )
    const delayedContent2 = new Promise<HtmlEscapedString>((resolve) =>
      setTimeout(() => resolve(<h2>World</h2>), 10)
    )
    const Content = () => {
      const content = use(delayedContent)
      const content2 = use(delayedContent2)
      return (
        <>
          {content}
          {content2}
        </>
      )
    }

    const stream = renderToReadableStream(
      <Suspense fallback={<p>Loading...</p>}>
        <Content />
      </Suspense>
    )

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks).toEqual([
      '<template id="H:1"></template><p>Loading...</p><!--/$-->',
      `<template><h1>Hello</h1><h2>World</h2></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:1')
while(n=d.nextSibling){n.remove();if(n.nodeType===8&&n.nodeValue==='/$')break}
d.replaceWith(c.content)
})(document)
</script>`,
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<h1>Hello</h1><h2>World</h2>'
    )
  })

  it('Nested calls to "use"', async () => {
    const delayedContent = new Promise<HtmlEscapedString>((resolve) =>
      setTimeout(() => resolve(<h1>Hello</h1>), 10)
    )
    const delayedContent2 = new Promise<HtmlEscapedString>((resolve) =>
      setTimeout(() => resolve(<p>paragraph</p>), 10)
    )

    const SubContent = () => {
      const content = use(delayedContent2)
      return <>{content}</>
    }
    const Content = () => {
      const content = use(delayedContent)
      return (
        <>
          {content}
          <SubContent />
        </>
      )
    }

    const stream = renderToReadableStream(
      <Suspense fallback={<p>Loading...</p>}>
        <Content />
      </Suspense>
    )

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks).toEqual([
      '<template id="H:2"></template><p>Loading...</p><!--/$-->',
      `<template><h1>Hello</h1><p>paragraph</p></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:2')
while(n=d.nextSibling){n.remove();if(n.nodeType===8&&n.nodeValue==='/$')break}
d.replaceWith(c.content)
})(document)
</script>`,
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<h1>Hello</h1><p>paragraph</p>'
    )
  })

  it('Complex fallback content', async () => {
    const delayedContent = new Promise<HtmlEscapedString>((resolve) =>
      setTimeout(() => resolve(<h1>Hello</h1>), 10)
    )

    const Content = () => {
      const content = use(delayedContent)
      return content
    }

    const stream = renderToReadableStream(
      <Suspense
        fallback={
          <>
            Loading<span>...</span>
          </>
        }
      >
        <Content />
      </Suspense>
    )

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks).toEqual([
      '<template id="H:3"></template>Loading<span>...</span><!--/$-->',
      `<template><h1>Hello</h1></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:3')
while(n=d.nextSibling){n.remove();if(n.nodeType===8&&n.nodeValue==='/$')break}
d.replaceWith(c.content)
})(document)
</script>`,
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<h1>Hello</h1>'
    )
  })
})
