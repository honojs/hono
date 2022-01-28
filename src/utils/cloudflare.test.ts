import { getContentFromKVAsset } from './cloudflare'

describe('Utils for Cloudflare Workers', () => {
  it('getContentFromKVAsset', async () => {
    let content = await getContentFromKVAsset('not-found.txt')
    expect(content).toBeUndefined()
    content = await getContentFromKVAsset('index')
    // Tests for KV for Workers Site does not work yet.
    // expect(content).not.toBeUndefined()
    // expect(content).toBe('This is index')
  })
})
