/* eslint-disable @typescript-eslint/no-explicit-any */
import { JSDOM } from 'jsdom'
import type { HtmlEscapedString } from '../utils/html'
import { HtmlEscapedCallbackPhase, resolveCallback as rawResolveCallback } from '../utils/html'
import { ErrorBoundary } from './components'
import { Suspense, renderToReadableStream } from './streaming'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx } from '.'

function resolveCallback(template: string | HtmlEscapedString) {
  return rawResolveCallback(template, HtmlEscapedCallbackPhase.Stream, false, {})
}

function replacementResult(html: string) {
  const document = new JSDOM(html, { runScripts: 'dangerously' }).window.document
  document.querySelectorAll('template, script').forEach((e) => e.remove())
  return document.body.innerHTML
}

const Fallback = () => <div>Out Of Service</div>

describe('ErrorBoundary', () => {
  let errorBoundaryCounter = 0
  let suspenseCounter = 0
  afterEach(() => {
    errorBoundaryCounter++
    suspenseCounter++
  })

  describe('sync', async () => {
    const Component = ({ error }: { error?: boolean }) => {
      if (error) {
        throw new Error('Error')
      }
      return <div>Hello</div>
    }

    it('no error', async () => {
      const html = (
        <ErrorBoundary fallback={<Fallback />}>
          <Component />
        </ErrorBoundary>
      )

      expect((await resolveCallback(await html.toString())).toString()).toEqual('<div>Hello</div>')

      errorBoundaryCounter--
      suspenseCounter--
    })

    it('error', async () => {
      const html = (
        <ErrorBoundary fallback={<Fallback />}>
          <Component error={true} />
        </ErrorBoundary>
      )

      expect((await resolveCallback(await html.toString())).toString()).toEqual(
        '<div>Out Of Service</div>'
      )

      suspenseCounter--
    })
  })

  describe('async', async () => {
    const Component = async ({ error }: { error?: boolean }) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      if (error) {
        throw new Error('Error')
      }
      return <div>Hello</div>
    }

    it('no error', async () => {
      const html = (
        <ErrorBoundary fallback={<Fallback />}>
          <Component />
        </ErrorBoundary>
      )

      expect((await resolveCallback(await html.toString())).toString()).toEqual('<div>Hello</div>')

      errorBoundaryCounter--
      suspenseCounter--
    })

    it('error', async () => {
      const html = (
        <ErrorBoundary fallback={<Fallback />}>
          <Component error={true} />
        </ErrorBoundary>
      )

      expect((await resolveCallback(await html.toString())).toString()).toEqual(
        '<div>Out Of Service</div>'
      )

      suspenseCounter--
    })
  })

  describe('async : nested', async () => {
    const handlers: Record<number, { resolve: (value: unknown) => void; reject: () => void }> = {}
    const Component = async ({ id }: { id: number }) => {
      await new Promise((resolve, reject) => (handlers[id] = { resolve, reject }))
      return <div>{id}</div>
    }

    it('no error', async () => {
      const html = (
        <ErrorBoundary fallback={<Fallback />}>
          <Component id={1} />
          <ErrorBoundary fallback={<Fallback />}>
            <Component id={2} />
          </ErrorBoundary>
        </ErrorBoundary>
      ).toString()

      Object.values(handlers).forEach(({ resolve }) => resolve(undefined))

      expect((await resolveCallback(await html)).toString()).toEqual('<div>1</div><div>2</div>')

      errorBoundaryCounter++
      suspenseCounter--
    })

    it('error in parent', async () => {
      const html = (
        <ErrorBoundary fallback={<Fallback />}>
          <Component id={1} />
          <ErrorBoundary fallback={<Fallback />}>
            <Component id={2} />
          </ErrorBoundary>
        </ErrorBoundary>
      ).toString()

      handlers[2].resolve(undefined)
      handlers[1].reject()

      expect((await resolveCallback(await html)).toString()).toEqual('<div>Out Of Service</div>')

      errorBoundaryCounter++
      suspenseCounter--
    })

    it('error in child', async () => {
      const html = (
        <ErrorBoundary fallback={<Fallback />}>
          <Component id={1} />
          <ErrorBoundary fallback={<Fallback />}>
            <Component id={2} />
          </ErrorBoundary>
        </ErrorBoundary>
      ).toString()

      handlers[1].resolve(undefined)
      handlers[2].reject()

      expect((await resolveCallback(await html)).toString()).toEqual(
        '<div>1</div><div>Out Of Service</div>'
      )

      errorBoundaryCounter++
      suspenseCounter--
    })
  })

  describe('streaming', async () => {
    const Component = async ({ error }: { error?: boolean }) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      if (error) {
        throw new Error('Error')
      }
      return <div>Hello</div>
    }

    it('no error', async () => {
      const stream = renderToReadableStream(
        <ErrorBoundary fallback={<Fallback />}>
          <Suspense fallback={<p>Loading...</p>}>
            <Component />
          </Suspense>
        </ErrorBoundary>
      )
      const chunks = []
      const textDecoder = new TextDecoder()
      for await (const chunk of stream as any) {
        chunks.push(textDecoder.decode(chunk))
      }

      expect(chunks).toEqual([
        `<template id="E:${errorBoundaryCounter}"></template><!--E:${errorBoundaryCounter}-->`,
        `<template data-hono-target="E:${errorBoundaryCounter}"><template id="H:${suspenseCounter}"></template><p>Loading...</p><!--/$--></template><script>
((d,c) => {
c=d.currentScript.previousSibling
d=d.getElementById('E:${errorBoundaryCounter}')
if(!d)return
d.parentElement.insertBefore(c.content,d.nextSibling)
})(document)
</script>`,
        `<template data-hono-target="H:${suspenseCounter}"><div>Hello</div></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${suspenseCounter}')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script><script>
((d,c,n) => {
d=d.getElementById('E:${errorBoundaryCounter}')
if(!d)return
n=d.nextSibling
while(n.nodeType!=8||n.nodeValue!='E:${errorBoundaryCounter}'){n=n.nextSibling}
n.remove()
d.remove()
})(document)
</script>`,
      ])

      expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
        '<div>Hello</div>'
      )
    })

    it('error', async () => {
      const html = (
        <ErrorBoundary fallback={<Fallback />}>
          <Component error={true} />
        </ErrorBoundary>
      )

      expect((await resolveCallback(await html.toString())).toString()).toEqual(
        '<div>Out Of Service</div>'
      )
    })
  })

  describe('streaming : contains multiple suspense', async () => {
    const handlers: Record<number, { resolve: (value: unknown) => void; reject: () => void }> = {}
    const Component = async ({ id }: { id: number }) => {
      await new Promise((resolve, reject) => (handlers[id] = { resolve, reject }))
      return <div>{id}</div>
    }

    it('no error', async () => {
      const stream = renderToReadableStream(
        <ErrorBoundary fallback={<Fallback />}>
          <Suspense fallback={<p>Loading...</p>}>
            <Component id={1} />
          </Suspense>
          <Suspense fallback={<p>Loading...</p>}>
            <Component id={2} />
          </Suspense>
          <Suspense fallback={<p>Loading...</p>}>
            <Component id={3} />
          </Suspense>
        </ErrorBoundary>
      )

      Object.values(handlers).forEach(({ resolve }) => resolve(undefined))

      const chunks = []
      const textDecoder = new TextDecoder()
      for await (const chunk of stream as any) {
        chunks.push(textDecoder.decode(chunk))
      }

      expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
        '<div>1</div><div>2</div><div>3</div>'
      )
    })

    it('error', async () => {
      const stream = renderToReadableStream(
        <ErrorBoundary fallback={<Fallback />}>
          <Suspense fallback={<p>Loading...</p>}>
            <Component id={1} />
          </Suspense>
          <Suspense fallback={<p>Loading...</p>}>
            <Component id={2} />
          </Suspense>
          <Suspense fallback={<p>Loading...</p>}>
            <Component id={3} />
          </Suspense>
        </ErrorBoundary>
      )

      handlers[1].resolve(undefined)
      handlers[2].resolve(undefined)
      handlers[3].reject()

      const chunks = []
      const textDecoder = new TextDecoder()
      for await (const chunk of stream as any) {
        chunks.push(textDecoder.decode(chunk))
      }

      expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
        '<div>Out Of Service</div>'
      )
    })
  })

  describe('streaming : nested', async () => {
    const handlers: Record<number, { resolve: (value: unknown) => void; reject: () => void }> = {}
    const Component = async ({ id }: { id: number }) => {
      await new Promise((resolve, reject) => (handlers[id] = { resolve, reject }))
      return <div>{id}</div>
    }

    it('no error', async () => {
      const stream = renderToReadableStream(
        <ErrorBoundary fallback={<Fallback />}>
          <Suspense fallback={<p>Loading...</p>}>
            <Component id={1} />
          </Suspense>
          <ErrorBoundary fallback={<Fallback />}>
            <Suspense fallback={<p>Loading...</p>}>
              <Component id={2} />
            </Suspense>
          </ErrorBoundary>
        </ErrorBoundary>
      )

      Object.values(handlers).forEach(({ resolve }) => resolve(undefined))

      const chunks = []
      const textDecoder = new TextDecoder()
      for await (const chunk of stream as any) {
        chunks.push(textDecoder.decode(chunk))
      }

      expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
        '<div>1</div><div>2</div>'
      )
    })

    it('error in parent', async () => {
      const stream = renderToReadableStream(
        <ErrorBoundary fallback={<Fallback />}>
          <Suspense fallback={<p>Loading...</p>}>
            <Component id={1} />
          </Suspense>
          <ErrorBoundary fallback={<Fallback />}>
            <Suspense fallback={<p>Loading...</p>}>
              <Component id={2} />
            </Suspense>
          </ErrorBoundary>
        </ErrorBoundary>
      )

      handlers[2].resolve(undefined)
      handlers[1].reject()

      const chunks = []
      const textDecoder = new TextDecoder()
      for await (const chunk of stream as any) {
        chunks.push(textDecoder.decode(chunk))
      }

      expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
        '<div>Out Of Service</div>'
      )
    })

    it('error in child', async () => {
      const stream = renderToReadableStream(
        <ErrorBoundary fallback={<Fallback />}>
          <Suspense fallback={<p>Loading...</p>}>
            <Component id={1} />
          </Suspense>
          <ErrorBoundary fallback={<Fallback />}>
            <Suspense fallback={<p>Loading...</p>}>
              <Component id={2} />
            </Suspense>
          </ErrorBoundary>
        </ErrorBoundary>
      )

      handlers[1].resolve(undefined)
      handlers[2].reject()

      const chunks = []
      const textDecoder = new TextDecoder()
      for await (const chunk of stream as any) {
        chunks.push(textDecoder.decode(chunk))
      }

      expect(replacementResult(`<html><body>${chunks.join('')}</body></html>`)).toEqual(
        '<div>1</div><div>Out Of Service</div>'
      )
    })
  })

  describe('onError', async () => {
    const Component = ({ error }: { error?: boolean }) => {
      if (error) {
        throw new Error('Error')
      }
      return <div>Hello</div>
    }

    it('no error', async () => {
      const errors: Error[] = []
      const html = (
        <ErrorBoundary fallback={<Fallback />} onError={(err) => errors.push(err)}>
          <Component />
        </ErrorBoundary>
      )

      expect((await resolveCallback(await html.toString())).toString()).toEqual('<div>Hello</div>')

      errorBoundaryCounter--
      suspenseCounter--

      expect(errors).toEqual([])
    })

    it('error', async () => {
      const errors: Error[] = []
      const html = (
        <ErrorBoundary fallback={<Fallback />} onError={(err) => errors.push(err)}>
          <Component error={true} />
        </ErrorBoundary>
      )

      expect((await resolveCallback(await html.toString())).toString()).toEqual(
        '<div>Out Of Service</div>'
      )

      suspenseCounter--

      expect(errors[0]).toEqual(new Error('Error'))
    })
  })

  describe('fallbackRender', async () => {
    const fallbackRenderer = (error: Error) => <div data-error>{error.message}</div>
    const Component = ({ error }: { error?: boolean }) => {
      if (error) {
        throw new Error('Error')
      }
      return <div>Hello</div>
    }

    it('no error', async () => {
      const errors: Error[] = []
      const html = (
        <ErrorBoundary fallbackRender={fallbackRenderer}>
          <Component />
        </ErrorBoundary>
      )

      expect((await resolveCallback(await html.toString())).toString()).toEqual('<div>Hello</div>')

      errorBoundaryCounter--
      suspenseCounter--

      expect(errors).toEqual([])
    })

    it('error', async () => {
      const html = (
        <ErrorBoundary fallbackRender={fallbackRenderer}>
          <Component error={true} />
        </ErrorBoundary>
      )

      expect((await resolveCallback(await html.toString())).toString()).toEqual(
        '<div data-error="true">Error</div>'
      )

      suspenseCounter--
    })
  })
})
