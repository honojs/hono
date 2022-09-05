import { StaticRouter } from './router'

describe('Basic Usage', () => {
  const router = new StaticRouter<string>()

  router.add('GET', '/hello', 'get hello')
  router.add('POST', '/hello', 'post hello')

  it('get, post hello', async () => {
    let res = router.match('GET', '/hello')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['get hello'])

    res = router.match('POST', '/hello')
    expect(res).not.toBeNull()
    expect(res?.handlers).toEqual(['post hello'])

    res = router.match('PUT', '/hello')
    expect(res).toBeNull()

    res = router.match('GET', '/')
    expect(res).toBeNull()
  })
})

describe('Multi match', () => {
  describe('Blog', () => {
    const router = new StaticRouter<string>()

    router.add('ALL', '*', 'middleware a')
    router.add('GET', '*', 'middleware b')
    router.add('GET', '/entry', 'get entries')
    it('GET /', async () => {
      const res = router.match('GET', '/')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a', 'middleware b'])
    })
    it('GET /entry', async () => {
      const res = router.match('GET', '/entry')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a', 'middleware b', 'get entries'])
    })
    it('DELETE /entry', async () => {
      const res = router.match('DELETE', '/entry')
      expect(res).not.toBeNull()
      expect(res?.handlers).toEqual(['middleware a'])
    })
  })
})
