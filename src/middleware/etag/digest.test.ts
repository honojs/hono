import { generateDigest } from './digest'

describe('generateDigest', () => {
  it('Should copy pending bytes from a stream that reuses its buffer', async () => {
    const scratch = new Uint8Array(4)
    let pullCount = 0
    const stream = new ReadableStream({
      pull(controller) {
        scratch.fill(pullCount === 0 ? 0x41 : 0x42)
        controller.enqueue(scratch)
        if (++pullCount === 2) {
          controller.close()
        }
      },
    })

    const digest = await generateDigest(stream, (body) => crypto.subtle.digest('SHA-1', body))

    expect(digest).toBe('7cd188ef3a9ea7fa0ee9c62c168709695460f5c0')
  })
})
