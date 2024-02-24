import { Context } from '../../context'
import { HonoRequest } from '../../request'
import { stream } from '.'

describe('Basic Streaming Helper', () => {
  const req = new HonoRequest(new Request('http://localhost/'))
  let c: Context
  beforeEach(() => {
    c = new Context(req)
  })

  it('Check stream Response', async () => {
    const res = stream(c, async (stream) => {
      for (let i = 0; i < 3; i++) {
        await stream.write(new Uint8Array([i]))
        await stream.sleep(1)
      }
    })
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    for (let i = 0; i < 3; i++) {
      const { value } = await reader.read()
      expect(value).toEqual(new Uint8Array([i]))
    }
  })

  it('Check stream Response if aborted by client', async () => {
    let aborted = false
    const res = stream(c, async (stream) => {
      stream.onAbort(() => {
        aborted = true
      })
      for (let i = 0; i < 3; i++) {
        await stream.write(new Uint8Array([i]))
        await stream.sleep(1)
      }
    })
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const { value } = await reader.read()
    expect(value).toEqual(new Uint8Array([0]))
    reader.cancel()
    expect(aborted).toBeTruthy()
  })

  it('Check stream Response if error occurred', async () => {
    const onError = vi.fn()
    const res = stream(
      c,
      async () => {
        throw new Error('error')
      },
      onError
    )
    if (!res.body) {
      throw new Error('Body is null')
    }
    const reader = res.body.getReader()
    const { value } = await reader.read()
    expect(value).toBeUndefined()
    expect(onError).toBeCalledTimes(1)
    expect(onError).toBeCalledWith(new Error('error'), expect.anything()) // 2nd argument is StreamingApi instance
  })
})
