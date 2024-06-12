/** @jsxImportSource ../ */
import { renderToReadableStream, renderToString } from './server'

describe('renderToString', () => {
  it('Should be able to render HTML element', () => {
    expect(renderToString(<h1>Hello</h1>)).toBe('<h1>Hello</h1>')
  })

  it('Should be able to render null', () => {
    expect(renderToString(null)).toBe('')
  })

  it('Should be able to render undefined', () => {
    expect(renderToString(undefined)).toBe('')
  })

  it('Should be able to render number', () => {
    expect(renderToString(1)).toBe('1')
  })

  it('Should be able to render string', () => {
    expect(renderToString('Hono')).toBe('Hono')
  })

  it('Should omit options', () => {
    expect(renderToString('Hono', { identifierPrefix: 'test' })).toBe('Hono')
  })

  it('Should raise error for async component', async () => {
    const AsyncComponent = async () => <h1>Hello from async component</h1>
    expect(() => renderToString(<AsyncComponent />)).toThrowError()
  })
})

describe('renderToReadableStream', () => {
  const textDecoder = new TextDecoder()
  const getStringFromStream = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
    const reader = stream.getReader()
    let str = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      str += textDecoder.decode(value)
    }
    return str
  }

  it('Should be able to render HTML element', async () => {
    const stream = await renderToReadableStream(<h1>Hello</h1>)
    const reader = stream.getReader()
    let { done, value } = await reader.read()
    expect(done).toBe(false)
    expect(textDecoder.decode(value)).toBe('<h1>Hello</h1>')
    done = (await reader.read()).done
    expect(done).toBe(true)
  })

  it('Should be able to render null', async () => {
    expect(await getStringFromStream(await renderToReadableStream(null))).toBe('')
  })

  it('Should be able to render undefined', async () => {
    expect(await getStringFromStream(await renderToReadableStream(undefined))).toBe('')
  })

  it('Should be able to render number', async () => {
    expect(await getStringFromStream(await renderToReadableStream(1))).toBe('1')
  })

  it('Should be able to render string', async () => {
    expect(await getStringFromStream(await renderToReadableStream('Hono'))).toBe('Hono')
  })

  it('Should be called `onError` if there is an error', async () => {
    const ErrorComponent = async () => {
      throw new Error('Server error')
    }

    const onError = vi.fn()
    expect(
      await getStringFromStream(await renderToReadableStream(<ErrorComponent />, { onError }))
    ).toBe('')
    expect(onError).toBeCalledWith(new Error('Server error'))
  })

  it('Should not be called `onError` if there is no error', async () => {
    const onError = vi.fn(() => 'error')
    expect(await getStringFromStream(await renderToReadableStream('Hono', { onError }))).toBe(
      'Hono'
    )
    expect(onError).toBeCalledTimes(0)
  })

  it('Should omit options, except onError', async () => {
    expect(
      await getStringFromStream(await renderToReadableStream('Hono', { identifierPrefix: 'test' }))
    ).toBe('Hono')
  })

  it('Should be able to render async component', async () => {
    const ChildAsyncComponent = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return <span>child async component</span>
    }

    const AsyncComponent = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return (
        <h1>
          Hello from async component
          <ChildAsyncComponent />
        </h1>
      )
    }

    const stream = await renderToReadableStream(<AsyncComponent />)
    const reader = stream.getReader()
    let { done, value } = await reader.read()
    expect(done).toBe(false)
    expect(textDecoder.decode(value)).toBe(
      '<h1>Hello from async component<span>child async component</span></h1>'
    )
    done = (await reader.read()).done
    expect(done).toBe(true)
  })
})
