import { JSDOM } from 'jsdom'
import type { HtmlEscapedString } from '../utils/html'
import { Suspense, renderToReadableStream } from './streaming'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, Fragment } from './index'

function replacementResult(html: string) {
  const document = new JSDOM(html, { runScripts: 'dangerously' }).window.document
  document.querySelectorAll('template, script').forEach((e) => e.remove())
  return document.body.innerHTML
}

describe('Streaming', () => {
  let suspenseCounter = 0
  afterEach(() => {
    suspenseCounter++
  })

  it('Suspense / renderToReadableStream', async () => {
    let contentEvaluatedCount = 0
    const Content = () => {
      contentEvaluatedCount++
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

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks).toEqual([
      `<template id="H:${suspenseCounter}"></template><p>Loading...</p><!--/$-->`,
      `<template><h1>Hello</h1></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<h1>Hello</h1>'
    )

    expect(contentEvaluatedCount).toEqual(1)
  })

  it('`throw promise` inside Suspense', async () => {
    let contentEvaluatedCount = 0
    let resolvedContent: HtmlEscapedString | undefined = undefined
    const Content = () => {
      contentEvaluatedCount++
      if (!resolvedContent) {
        throw new Promise<void>((resolve) =>
          setTimeout(() => {
            resolvedContent = <p>thrown a promise then resolved</p> as HtmlEscapedString
            resolve()
          }, 10)
        )
      }
      return resolvedContent
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
      `<template id="H:${suspenseCounter}"></template><p>Loading...</p><!--/$-->`,
      `<template><p>thrown a promise then resolved</p></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<p>thrown a promise then resolved</p>'
    )

    expect(contentEvaluatedCount).toEqual(2)
  })

  it('simple content inside Suspense', async () => {
    const Content = () => {
      return <h1>Hello</h1>
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

    expect(chunks).toEqual(['<h1>Hello</h1>'])
  })

  it('resolve(undefined)', async () => {
    const Content = async () => {
      const content = await Promise.resolve(undefined)
      return <p>{content}</p>
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
      `<template id="H:${suspenseCounter}"></template><p>Loading...</p><!--/$-->`,
      `<template><p></p></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual('<p></p>')
  })

  it('resolve(null)', async () => {
    const Content = async () => {
      const content = await Promise.resolve(null)
      return <p>{content}</p>
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
      `<template id="H:${suspenseCounter}"></template><p>Loading...</p><!--/$-->`,
      `<template><p></p></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual('<p></p>')
  })

  // This test should end successfully , but vitest catches the global unhandledRejection and makes an error, so it temporarily skips
  it.skip('reject()', async () => {
    const Content = async () => {
      const content = await Promise.reject()
      return <p>{content}</p>
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
      `<template id="H:${suspenseCounter}"></template><p>Loading...</p><!--/$-->`,
      '',
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<p>Loading...</p><!--/$-->'
    )
  })

  it('Multiple calls to "use"', async () => {
    const delayedContent = new Promise<HtmlEscapedString>((resolve) =>
      setTimeout(() => resolve(<h1>Hello</h1>), 10)
    )
    const delayedContent2 = new Promise<HtmlEscapedString>((resolve) =>
      setTimeout(() => resolve(<h2>World</h2>), 10)
    )
    const Content = async () => {
      const content = await delayedContent
      const content2 = await delayedContent2
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
      `<template id="H:${suspenseCounter}"></template><p>Loading...</p><!--/$-->`,
      `<template><h1>Hello</h1><h2>World</h2></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<h1>Hello</h1><h2>World</h2>'
    )
  })

  it('Complex fallback content', async () => {
    const delayedContent = new Promise<HtmlEscapedString>((resolve) =>
      setTimeout(() => resolve(<h1>Hello</h1>), 10)
    )

    const Content = async () => {
      const content = await delayedContent
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
      `<template id="H:${suspenseCounter}"></template>Loading<span>...</span><!--/$-->`,
      `<template><h1>Hello</h1></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<h1>Hello</h1>'
    )
  })

  it('renderToReadableStream(str: string)', async () => {
    const str = '<h1>Hello</h1>'
    const stream = renderToReadableStream(str as HtmlEscapedString)

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks).toEqual([str])
  })
})
