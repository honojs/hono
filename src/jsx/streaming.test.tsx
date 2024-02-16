/* eslint-disable @typescript-eslint/no-explicit-any */
import { JSDOM } from 'jsdom'
import { raw } from '../helper/html'
import { HtmlEscapedCallbackPhase, resolveCallback } from '../utils/html'
import type { HtmlEscapedString } from '../utils/html'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, Fragment } from './base'
import { use } from './hooks'
import { Suspense, renderToReadableStream } from './streaming'

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
      `<template data-hono-target="H:${suspenseCounter}"><h1>Hello</h1></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
if(!d)return
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
            resolvedContent = (<p>thrown a promise then resolved</p>) as HtmlEscapedString
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
      `<template data-hono-target="H:${suspenseCounter}"><p>thrown a promise then resolved</p></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
if(!d)return
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

    suspenseCounter -= 1 // fallback is not rendered
  })

  it('children Suspense', async () => {
    const Content1 = () =>
      new Promise<HtmlEscapedString>((resolve) => setTimeout(() => resolve(<h1>Hello</h1>), 10))
    const Content2 = () =>
      new Promise<HtmlEscapedString>((resolve) => setTimeout(() => resolve(<h2>Hono</h2>), 10))

    const stream = renderToReadableStream(
      <Suspense fallback={<p>Loading...</p>}>
        <Suspense fallback={<p>Loading sub content1...</p>}>
          <Content1 />
        </Suspense>
        <Suspense fallback={<p>Loading sub content2...</p>}>
          <Content2 />
        </Suspense>
      </Suspense>
    )

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<h1>Hello</h1><h2>Hono</h2>'
    )

    suspenseCounter += 2
  })

  it('children Suspense: Suspense and string', async () => {
    const Content1 = () =>
      new Promise<HtmlEscapedString>((resolve) => setTimeout(() => resolve(<h1>Hello</h1>), 10))

    const stream = renderToReadableStream(
      <Suspense fallback={<p>Loading...</p>}>
        <Suspense fallback={<p>Loading sub content1...</p>}>
          <Content1 />
        </Suspense>
        Hono
      </Suspense>
    )

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<h1>Hello</h1>Hono'
    )

    suspenseCounter += 1
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
      `<template data-hono-target="H:${suspenseCounter}"><p></p></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
if(!d)return
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
      `<template data-hono-target="H:${suspenseCounter}"><p></p></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual('<p></p>')
  })

  it('reject()', async () => {
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

  it('Multiple "await" call', async () => {
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
      `<template data-hono-target="H:${suspenseCounter}"><h1>Hello</h1><h2>World</h2></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
if(!d)return
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
      `<template data-hono-target="H:${suspenseCounter}"><h1>Hello</h1></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<h1>Hello</h1>'
    )
  })

  it('nested Suspense', async () => {
    const SubContent = () => {
      const content = new Promise<HtmlEscapedString>((resolve) =>
        setTimeout(() => resolve(<h2>World</h2>), 10)
      )
      return content
    }

    const Content = () => {
      const content = new Promise<HtmlEscapedString>((resolve) =>
        setTimeout(
          () =>
            resolve(
              <>
                <h1>Hello</h1>
                <Suspense fallback={<p>Loading sub content...</p>}>
                  <SubContent />
                </Suspense>
              </>
            ),
          10
        )
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
      `<template data-hono-target="H:${suspenseCounter}"><h1>Hello</h1><template id=\"H:${
        suspenseCounter + 1
      }\"></template><p>Loading sub content...</p><!--/$--></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
      `<template data-hono-target="H:${suspenseCounter + 1}"><h2>World</h2></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter + 1}')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<h1>Hello</h1><h2>World</h2>'
    )
    suspenseCounter++
  })

  it('In multiple Suspense, go ahead in the order of resolved', async () => {
    const SubContent2 = () => {
      const content = new Promise<HtmlEscapedString>((resolve) =>
        setTimeout(() => resolve(<p>first</p>), 20)
      )
      return content
    }
    const SubContent1 = () => {
      const content = new Promise<HtmlEscapedString>((resolve) =>
        setTimeout(
          () =>
            resolve(
              <Suspense fallback={<p>Loading content2...</p>}>
                <SubContent2 />
              </Suspense>
            ),
          10
        )
      )
      return content
    }
    const SubContent3 = () => {
      const content = new Promise<HtmlEscapedString>((resolve) =>
        setTimeout(() => resolve(<p>last</p>), 40)
      )
      return content
    }

    const Content = () => {
      const content = new Promise<HtmlEscapedString>((resolve) =>
        setTimeout(
          () =>
            resolve(
              <>
                <Suspense fallback={<p>Loading content1...</p>}>
                  <SubContent1 />
                </Suspense>
                <Suspense fallback={<p>Loading content3...</p>}>
                  <SubContent3 />
                </Suspense>
              </>
            ),
          10
        )
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

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<p>first</p><p>last</p>'
    )
  })

  it('Suspense with resolveStream', async () => {
    let contentEvaluatedCount = 0
    const Content = () => {
      contentEvaluatedCount++
      const content = new Promise<HtmlEscapedString>((resolve) =>
        setTimeout(() => resolve(<h1>Hello</h1>), 10)
      )
      return content
    }

    const str = await resolveCallback(
      await (
        <Suspense fallback={<p>Loading...</p>}>
          <Content />
        </Suspense>
      ).toString(),
      HtmlEscapedCallbackPhase.Stream,
      false,
      {}
    )

    expect(str).toEqual('<h1>Hello</h1>')
    expect(contentEvaluatedCount).toEqual(1)
  })

  it('renderToReadableStream(str: string)', async () => {
    const str = '<h1>Hello</h1>'
    const stream = renderToReadableStream(raw(str))

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks).toEqual([str])
  })

  it('renderToReadableStream(promise: Promise<HtmlEscapedString>)', async () => {
    const stream = renderToReadableStream(Promise.resolve(raw('<h1>Hello</h1>')))

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks).toEqual(['<h1>Hello</h1>'])

    suspenseCounter++
  })

  describe('use()', async () => {
    it('render to string', async () => {
      const Content = () => {
        const promise = new Promise((resolve) => setTimeout(() => resolve('Hello from use()'), 0))
        const message = use(promise)
        return <h1>{message}</h1>
      }

      const str = await resolveCallback(
        await (
          <Suspense fallback={<p>Loading...</p>}>
            <Content />
          </Suspense>
        ).toString(),
        HtmlEscapedCallbackPhase.Stream,
        false,
        {}
      )
      expect(str).toEqual('<h1>Hello from use()</h1>')
    })

    it('render to stream', async () => {
      const Content = () => {
        const promise = new Promise((resolve) => setTimeout(() => resolve('Hello from use()'), 0))
        const message = use(promise)
        return <h1>{message}</h1>
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
        `<template data-hono-target="H:${suspenseCounter}"><h1>Hello from use()</h1></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
      ])

      expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
        '<h1>Hello from use()</h1>'
      )
    })
  })
})
