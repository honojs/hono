import { getContentFromKVAsset } from './cloudflare'

// Mock
const store: { [key: string]: string } = {
  'index.abcdef.html': 'This is index',
  'assets/static/plain.abcdef.txt': 'Asset text',
}
const manifest = JSON.stringify({
  'index.html': 'index.abcdef.html',
  'assets/static/plain.txt': 'assets/static/plain.abcdef.txt',
})

Object.assign(global, { __STATIC_CONTENT_MANIFEST: manifest })
Object.assign(global, {
  __STATIC_CONTENT: {
    get: (path: string) => {
      return store[path]
    },
  },
})

describe('Utils for Cloudflare Workers', () => {
  it('getContentFromKVAsset', async () => {
    let content = await getContentFromKVAsset('not-found.txt')
    expect(content).toBeUndefined()
    content = await getContentFromKVAsset('index.html')
    expect(content).not.toBeUndefined()
    expect(content).toBe('This is index')
    content = await getContentFromKVAsset('assets/static/plain.txt')
    expect(content).not.toBeUndefined()
    expect(content).toBe('Asset text')
  })
})
