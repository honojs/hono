import type { Cookie } from './cookie'
import { parse, serialize } from './cookie'

describe('Parse cookie', () => {
  it('Should parse cookie', () => {
    const cookieString = 'yummy_cookie=choco; tasty_cookie = strawberry '
    const cookie: Cookie = parse(cookieString)
    expect(cookie['yummy_cookie']).toBe('choco')
    expect(cookie['tasty_cookie']).toBe('strawberry')
  })
})

describe('Set cookie', () => {
  it('Should serialize cookie', () => {
    expect(serialize('delicious_cookie', 'macha')).toBe('delicious_cookie=macha')
    expect(
      serialize('great_cookie', 'banana', {
        path: '/',
        secure: true,
        domain: 'example.com',
        httpOnly: true,
        maxAge: 1000,
        expires: new Date(Date.UTC(2000, 11, 24, 10, 30, 59, 900)),
        sameSite: 'Strict',
      })
    ).toBe(
      'great_cookie=banana; Max-Age=1000; Domain=example.com; Path=/; Expires=Sun, 24 Dec 2000 10:30:59 GMT; HttpOnly; Secure; SameSite=Strict'
    )
  })
})
