/** @jsxImportSource ./ */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { JSDOM } from 'jsdom'
import { raw } from '../helper/html'
import { HtmlEscapedCallbackPhase, resolveCallback } from '../utils/html'
import type { HtmlEscapedString } from '../utils/html'
import { createContext, useContext } from './context'
import { buildDataStack } from './dom/render'
import { use } from './hooks'
import { Suspense, renderToReadableStream, StreamingContext } from './streaming'

function replacementResult(html: string) {
  const document = new JSDOM(html, { runScripts: 'dangerously' }).window.document
  document.querySelectorAll('template, script').forEach((e) => e.remove())
  return document.body.innerHTML
}

async function drainStream(stream: unknown): Promise<string> {
  const textDecoder = new TextDecoder()
  let html = ''
  for await (const chunk of stream as any) {
    html += textDecoder.decode(chunk)
  }
  return html
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

  it('Suspense with StreamingContext', async () => {
    let contentEvaluatedCount = 0
    const Content = () => {
      contentEvaluatedCount++
      const content = new Promise<HtmlEscapedString>((resolve) =>
        setTimeout(() => resolve(<h1>Hello</h1>), 10)
      )
      return content
    }

    const stream = renderToReadableStream(
      <StreamingContext value={{ scriptNonce: 'test-nonce' }}>
        <Suspense fallback={<p>Loading...</p>}>
          <Content />
        </Suspense>
      </StreamingContext>
    )

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks).toEqual([
      `<template id="H:${suspenseCounter}"></template><p>Loading...</p><!--/$-->`,
      `<template data-hono-target="H:${suspenseCounter}"><h1>Hello</h1></template><script nonce="test-nonce">
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

  it('nullish children', async () => {
    const stream = renderToReadableStream(
      <div>
        <Suspense fallback={<p>Loading...</p>}>{[null, undefined]}</Suspense>
      </div>
    )

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks).toEqual(['<div></div>'])

    suspenseCounter -= 1 // fallback is not rendered
  })

  it('without children', async () => {
    const stream = renderToReadableStream(
      <div>
        <Suspense fallback={<p>Loading...</p>}></Suspense>
      </div>
    )

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks).toEqual(['<div></div>'])

    suspenseCounter -= 1 // fallback is not rendered
  })

  it('only a "false" child', async () => {
    const stream = renderToReadableStream(
      <div>
        <Suspense fallback={<p>Loading...</p>}>{false}</Suspense>
      </div>
    )

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks).toEqual(['<div></div>'])

    suspenseCounter -= 1 // fallback is not rendered
  })

  it('async nullish children', async () => {
    let resolved = false
    const Content = () => {
      if (!resolved) {
        resolved = true
        throw new Promise<void>((r) =>
          setTimeout(() => {
            resolved = true
            r()
          }, 10)
        )
      }
      return <h1>Hello</h1>
    }

    const stream = renderToReadableStream(
      <Suspense fallback={<p>Loading...</p>}>
        <Content />
        {[null, undefined]}
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
  })

  it('boolean children', async () => {
    const stream = renderToReadableStream(
      <div>
        <Suspense fallback={<p>Loading...</p>}>{[true, false]}</Suspense>
      </div>
    )

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks).toEqual(['<div></div>'])

    suspenseCounter -= 1 // fallback is not rendered
  })

  it('async boolean children', async () => {
    let resolved = false
    const Content = () => {
      if (!resolved) {
        resolved = true
        throw new Promise<void>((r) =>
          setTimeout(() => {
            resolved = true
            r()
          }, 10)
        )
      }
      return <h1>Hello</h1>
    }

    const stream = renderToReadableStream(
      <Suspense fallback={<p>Loading...</p>}>
        <Content />
        {[true, false]}
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

    const onError = vi.fn()
    const stream = renderToReadableStream(
      <Suspense fallback={<p>Loading...</p>}>
        <Content />
      </Suspense>,
      onError
    )

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(onError).toBeCalledTimes(1)

    expect(chunks).toEqual([
      `<template id="H:${suspenseCounter}"></template><p>Loading...</p><!--/$-->`,
      '',
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<p>Loading...</p><!--/$-->'
    )
  })

  it('closed()', async () => {
    const Content = async () => {
      await new Promise<void>((resolve) =>
        setTimeout(() => {
          vi.spyOn(ReadableStreamDefaultController.prototype, 'enqueue').mockImplementation(() => {
            throw new Error('closed')
          })
          resolve()
        }, 10)
      )
      return <p>content</p>
    }

    const onError = vi.fn()
    const stream = renderToReadableStream(
      <>
        <Suspense fallback={<p>Loading...</p>}>
          <Content />
        </Suspense>
        <Suspense fallback={<p>Loading...</p>}>
          <Content />
        </Suspense>
      </>,
      onError
    )

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(onError).toBeCalledTimes(1)

    expect(chunks).toEqual([
      `<template id="H:${suspenseCounter}"></template><p>Loading...</p><!--/$--><template id="H:${
        suspenseCounter + 1
      }"></template><p>Loading...</p><!--/$-->`,
    ])

    expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
      '<p>Loading...</p><!--/$--><p>Loading...</p><!--/$-->'
    )

    suspenseCounter++
    await new Promise((resolve) => setTimeout(resolve, 10))
    vi.restoreAllMocks()
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

  it('renders Suspense fallback with outer context values', async () => {
    const ThemeContext = createContext('default')
    const Fallback = () => <p>Loading {useContext(ThemeContext)}</p>
    const Content = () =>
      new Promise<HtmlEscapedString>((resolve) => setTimeout(() => resolve(<h1>Done</h1>), 10))

    const stream = renderToReadableStream(
      <ThemeContext.Provider value='outer'>
        <Suspense fallback={<Fallback />}>
          <Content />
        </Suspense>
      </ThemeContext.Provider>
    )

    const chunks = []
    const textDecoder = new TextDecoder()
    for await (const chunk of stream as any) {
      chunks.push(textDecoder.decode(chunk))
    }

    expect(chunks[0]).toBe(
      `<template id="H:${suspenseCounter}"></template><p>Loading outer</p><!--/$-->`
    )
    expect(chunks.join('')).toContain('<h1>Done</h1>')
    expect(chunks.join('')).not.toContain('default')
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
      const promise = new Promise((resolve) => setTimeout(() => resolve('Hello from use()'), 0))
      const Content = () => {
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
      const promise = new Promise((resolve) => setTimeout(() => resolve('Hello from use()'), 0))
      const Content = () => {
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

  it('should not throw ERR_INVALID_STATE when reader is cancelled during nested Suspense streaming', async () => {
    const unhandled: unknown[] = []
    const onRejection = (e: unknown) => unhandled.push(e)
    process.on('unhandledRejection', onRejection)

    const SubContent = async () => <h2>World</h2>
    const Content = async () => (
      <>
        <h1>Hello</h1>
        <Suspense fallback={<p>Loading sub...</p>}>
          <SubContent />
        </Suspense>
      </>
    )

    const onError = vi.fn()
    const stream = renderToReadableStream(
      <Suspense fallback={<p>Loading...</p>}>
        <Content />
      </Suspense>,
      onError
    )

    const reader = stream.getReader()
    const firstChunk = await reader.read()
    expect(firstChunk.done).toBe(false)

    // Simulate client disconnect
    await reader.cancel()

    // Wait for nested Suspense callbacks to fire against the closed controller
    await new Promise((resolve) => setTimeout(resolve))

    expect(unhandled).toHaveLength(0)
    expect(onError).not.toHaveBeenCalled()

    process.off('unhandledRejection', onRejection)
  })

  it('should not call onError when reader is cancelled during a slow callback resolution', async () => {
    const unhandled: unknown[] = []
    const onRejection = (e: unknown) => unhandled.push(e)
    process.on('unhandledRejection', onRejection)

    let signalCallbackStarted!: () => void
    const callbackStarted = new Promise<void>((r) => {
      signalCallbackStarted = r
    })

    const Content = async () =>
      raw('<p>content</p>', [
        ((opts: any) => {
          if (opts.phase === HtmlEscapedCallbackPhase.BeforeStream) {
            signalCallbackStarted()
            return new Promise<string>((r) => setTimeout(() => r('')))
          }
          return undefined
        }) as any,
      ])

    const onError = vi.fn()
    const stream = renderToReadableStream(
      <Suspense fallback={<p>Loading...</p>}>
        <Content />
      </Suspense>,
      onError
    )

    const reader = stream.getReader()
    await reader.read()

    await callbackStarted
    await reader.cancel()

    await new Promise((resolve) => setTimeout(resolve))

    expect(unhandled).toHaveLength(0)
    expect(onError).not.toHaveBeenCalled()

    process.off('unhandledRejection', onRejection)
  })

  it('should not throw when cancelled before initial content resolves', async () => {
    const unhandled: unknown[] = []
    const onRejection = (e: unknown) => unhandled.push(e)
    process.on('unhandledRejection', onRejection)

    const onError = vi.fn()
    const stream = renderToReadableStream(
      Promise.resolve(raw('<p>slow content</p>') as HtmlEscapedString),
      onError
    )

    const reader = stream.getReader()
    await reader.cancel()

    await new Promise((resolve) => setTimeout(resolve))

    expect(unhandled).toHaveLength(0)
    expect(onError).not.toHaveBeenCalled()

    process.off('unhandledRejection', onRejection)
  })

  it('pops buildDataStack when a deferred re-render rejects', async () => {
    const baseLength = buildDataStack.length

    const deferred = new Promise<string>((resolve) => setTimeout(() => resolve('x'), 10))
    let first = true
    const Content = () => {
      if (first) {
        // Suspend like use() does so Suspense defers the re-render.
        first = false
        throw deferred
      }
      throw new Error('boom')
    }

    const onError = vi.fn(() => '')
    const stream = renderToReadableStream(
      <Suspense fallback={<p>Loading</p>}>
        <Content />
      </Suspense>,
      onError
    )
    for await (const _ of stream as any) {
      // drain
    }

    expect(onError).toHaveBeenCalledTimes(1)
    // The deferred re-render pushed a stack frame; rejecting must still pop it.
    expect(buildDataStack.length).toBe(baseLength)
  })

  it('isolates context between concurrent streaming renders', async () => {
    // Default value is distinct from both requests so a cross-request leak
    // (reading the other request's value) would be detectable.
    const SessionContext = createContext('nobody')
    const waits = new Map<string, Promise<void>>()
    const entered = new Map<string, () => void>()

    const Dashboard = async ({ name }: { name: string }) => {
      // Read context only after suspending, the pattern that previously leaked.
      entered.get(name)?.()
      await waits.get(name)
      return <span>role:{useContext(SessionContext)}</span>
    }

    const drain = async (value: string) => {
      return drainStream(
        renderToReadableStream(
          <SessionContext.Provider value={value}>
            <Dashboard name={value} />
          </SessionContext.Provider>
        )
      )
    }

    let resolveAdmin!: () => void
    let resolveGuest!: () => void
    waits.set(
      'admin',
      new Promise<void>((resolve) => {
        resolveAdmin = resolve
      })
    )
    waits.set(
      'guest',
      new Promise<void>((resolve) => {
        resolveGuest = resolve
      })
    )
    const adminEntered = new Promise<void>((resolve) => {
      entered.set('admin', resolve)
    })
    const guestEntered = new Promise<void>((resolve) => {
      entered.set('guest', resolve)
    })

    const adminDrain = drain('admin')
    const guestDrain = drain('guest')

    await Promise.all([adminEntered, guestEntered])
    resolveGuest()
    await Promise.resolve()
    resolveAdmin()

    const [adminHtml, guestHtml] = await Promise.all([adminDrain, guestDrain])

    expect(adminHtml).toContain('role:admin')
    expect(adminHtml).not.toContain('role:guest')
    expect(guestHtml).toContain('role:guest')
    expect(guestHtml).not.toContain('role:admin')
  })
})
