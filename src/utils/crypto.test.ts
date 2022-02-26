import { sha256, sha1, decodeBase64 } from './crypto'

describe('crypto', () => {
  it('sha256', async () => {
    expect(await sha256('hono')).toBe(
      '8b3dc17add91b7e8f0b5109a389927d66001139cd9b03fa7b95f83126e1b2b23'
    )
    expect(await sha256('炎')).toBe(
      '1fddc5a562ee1fbeb4fc6def7d4be4911fcdae4273b02ae3a507b170ba0ea169'
    )
    expect(await sha256('abcdedf')).not.toBe('abcdef')
  })

  it('sha1', async () => {
    expect(await sha1('hono')).toBe('28c7e86f5732391917876b45c06c626c04d77f39')
    expect(await sha1('炎')).toBe('d56e09ae2421b2b8a0b5ee5fdceaed663c8c9472')
    expect(await sha1('abcdedf')).not.toBe('abcdef')
  })

  it('decodeBaes64', async () => {
    expect(await decodeBase64('aG9vb29vb29vbw==')).toBe('hooooooooo')
    expect(await decodeBase64('54KO')).toBe('炎')
    expect(await decodeBase64('abcdedf')).not.toBe('abcdef')
  })
})
