import { RegExpRouter } from '../reg-exp-router'
import { TrieRouter } from '../trie-router'
import { SmartRouter } from './router'

describe('RegExpRouter', () => {
  describe('Complex', () => {
    let router: SmartRouter<string>
    beforeEach(() => {
      router = new SmartRouter<string>({
        routers: [new RegExpRouter(), new TrieRouter()],
      })
    })

    it('Named Param', async () => {
      router.add('GET', '/entry/:id', 'get entry')
      const res = router.match('GET', '/entry/123')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['get entry'])
      expect(res?.params['id']).toBe('123')
      expect(router.activeRouter).toBeInstanceOf(RegExpRouter)
      expect(router.name).toBe('SmartRouter + RegExpRouter')
    })

    it('Wildcard', async () => {
      router.add('GET', '/wild/*/card', 'get wildcard')
      const res = router.match('GET', '/wild/xxx/card')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['get wildcard'])
    })

    it('Default', async () => {
      router.add('GET', '/api/abc', 'get api')
      router.add('GET', '/api/*', 'fallback')
      let res = router.match('GET', '/api/abc')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['get api', 'fallback'])
      res = router.match('GET', '/api/def')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['fallback'])
    })

    it('Regexp', async () => {
      router.add('GET', '/post/:date{[0-9]+}/:title{[a-z]+}', 'get post')
      let res = router.match('GET', '/post/20210101/hello')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['get post'])
      expect(res?.params['date']).toBe('20210101')
      expect(res?.params['title']).toBe('hello')
      res = router.match('GET', '/post/onetwothree')
      expect(res).toBeNull()
      res = router.match('GET', '/post/123/123')
      expect(res).toBeNull()
    })

    it('/*', async () => {
      router.add('GET', '/api/*', 'auth middleware')
      router.add('GET', '/api', 'top')
      router.add('GET', '/api/posts', 'posts')
      router.add('GET', '/api/*', 'fallback')

      let res = router.match('GET', '/api')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['auth middleware', 'top', 'fallback'])

      res = router.match('GET', '/api/posts')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['auth middleware', 'posts', 'fallback'])
    })
  })
})

describe('TrieRouter', () => {
  const router = new SmartRouter<string>({
    routers: [new RegExpRouter(), new TrieRouter()],
  })

  router.add('GET', '/:user/entries', 'get user entries')
  router.add('GET', '/entry/:name', 'get entry')
  it('GET /entry/entry', async () => {
    const res = router.match('GET', '/entry/entries')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get user entries', 'get entry'])
    expect(res?.params['user']).toBe('entry')
    expect(res?.params['name']).toBe('entries')
    expect(router.activeRouter).toBeInstanceOf(TrieRouter)
    expect(router.name).toBe('SmartRouter + TrieRouter')
  })
})
