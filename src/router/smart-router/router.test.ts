import { RegExpRouter } from '../reg-exp-router'
import { TrieRouter } from '../trie-router'
import { SmartRouter } from './router'

describe('RegExpRouter', () => {
  describe('Complex', () => {
    let router: SmartRouter<string>
    beforeEach(() => {
      router = new SmartRouter<string>({
        routers: [new RegExpRouter(), new TrieRouter()]
      })
    })

    it('Named Param', async () => {
      router.add('GET', '/entry/:id', 'get entry')
      const [res, stash] = router.match('GET', '/entry/123')
      expect(res.length).toBe(1)
      expect(res[0][0]).toEqual('get entry')
      expect(stash?.[res[0][1]['id'] as number] ?? res[0][1]['id']).toBe('123')
      expect(router.activeRouter).toBeInstanceOf(RegExpRouter)
      expect(router.name).toBe('SmartRouter + RegExpRouter')
    })

    it('Wildcard', async () => {
      router.add('GET', '/wild/*/card', 'get wildcard')
      const [res] = router.match('GET', '/wild/xxx/card')
      expect(res.length).toBe(1)
      expect(res[0][0]).toEqual('get wildcard')
    })

    it('Default', async () => {
      router.add('GET', '/api/abc', 'get api')
      router.add('GET', '/api/*', 'fallback')
      let [res] = router.match('GET', '/api/abc')
      expect(res.length).toBe(2)
      expect(res[0][0]).toEqual('get api')
      expect(res[1][0]).toEqual('fallback')
      ;[res] = router.match('GET', '/api/def')
      expect(res.length).toBe(1)
      expect(res[0][0]).toEqual('fallback')
    })

    it('Regexp', async () => {
      router.add('GET', '/post/:date{[0-9]+}/:title{[a-z]+}', 'get post')
      let [res, stash] = router.match('GET', '/post/20210101/hello')
      expect(res.length).toBe(1)
      expect(res[0][0]).toEqual('get post')
      expect(stash?.[res[0][1]['date'] as number] ?? res[0][1]['date']).toBe('20210101')
      expect(stash?.[res[0][1]['title'] as number] ?? res[0][1]['title']).toBe('hello')
      ;[res] = router.match('GET', '/post/onetwothree')
      expect(res.length).toBe(0)
      ;[res] = router.match('GET', '/post/123/123')
      expect(res.length).toBe(0)
    })

    it('/*', async () => {
      router.add('GET', '/api/*', 'auth middleware')
      router.add('GET', '/api', 'top')
      router.add('GET', '/api/posts', 'posts')
      router.add('GET', '/api/*', 'fallback')

      let [res] = router.match('GET', '/api')
      expect(res.length).toBe(3)
      expect(res[0][0]).toEqual('auth middleware')
      expect(res[1][0]).toEqual('top')
      expect(res[2][0]).toEqual('fallback')
      ;[res] = router.match('GET', '/api/posts')
      expect(res.length).toBe(3)
      expect(res[0][0]).toEqual('auth middleware')
      expect(res[1][0]).toEqual('posts')
      expect(res[2][0]).toEqual('fallback')
    })
  })
})

describe('TrieRouter', () => {
  const router = new SmartRouter<string>({
    routers: [new RegExpRouter(), new TrieRouter()]
  })

  router.add('GET', '/:user/entries', 'get user entries')
  router.add('GET', '/entry/:name', 'get entry')
  it('GET /entry/entry', async () => {
    const [res] = router.match('GET', '/entry/entries')
    expect(res.length).toBe(2)
    expect(res[0][0]).toEqual('get user entries')
    expect(res[0][1]['user']).toBe('entry')
    expect(res[0][1]['name']).toBe(undefined)
    expect(res[1][0]).toEqual('get entry')
    expect(res[1][1]['user']).toBe(undefined)
    expect(res[1][1]['name']).toBe('entries')
    expect(router.activeRouter).toBeInstanceOf(TrieRouter)
    expect(router.name).toBe('SmartRouter + TrieRouter')
  })
})
