import type { Cookie, SignedCookie } from './cookie'
import { parse, parseSigned, serialize, serializeSigned } from './cookie'

describe('Parse cookie', () => {
  it('Should parse cookies', () => {
    const cookieString = 'yummy_cookie=choco; tasty_cookie = strawberry '
    const cookie: Cookie = parse(cookieString)
    expect(cookie['yummy_cookie']).toBe('choco')
    expect(cookie['tasty_cookie']).toBe('strawberry')
  })

  it('Should parse one cookie specified by name', () => {
    const cookieString = 'yummy_cookie=choco; tasty_cookie = strawberry '
    const cookie: Cookie = parse(cookieString, 'yummy_cookie')
    expect(cookie['yummy_cookie']).toBe('choco')
    expect(cookie['tasty_cookie']).toBeUndefined()
  })

  it('Should parse cookies but ignore signed cookies', () => {
    const cookieString =
      'yummy_cookie=choco; tasty_cookie = strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D'
    const cookie: Cookie = parse(cookieString)
    expect(cookie['yummy_cookie']).toBe('choco')
    expect(cookie['tasty_cookie']).toBeUndefined()
  })

  it('Should parse signed cookies', async () => {
    const secret = 'secret ingredient'
    const cookieString =
      'yummy_cookie=choco.UdFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie = strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D'
    const cookie: SignedCookie = await parseSigned(cookieString, secret)
    expect(cookie['yummy_cookie']).toBe('choco')
    expect(cookie['tasty_cookie']).toBe('strawberry')
  })

  it('Should parse signed cookies and return "false" for wrong signature', async () => {
    const secret = 'secret ingredient'
    const cookieString =
      'yummy_cookie=choco.UdFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie = strawberry.invalidsignatur%3D'
    const cookie: SignedCookie = await parseSigned(cookieString, secret)
    expect(cookie['yummy_cookie']).toBe('choco')
    expect(cookie['tasty_cookie']).toBe(false)
  })

  it('Should parse one signed cookie specified by name', async () => {
    const secret = 'secret ingredient'
    const cookieString =
      'yummy_cookie=choco.UdFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie = strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D'
    const cookie: SignedCookie = await parseSigned(cookieString, secret, 'tasty_cookie')
    expect(cookie['yummy_cookie']).toBeUndefined()
    expect(cookie['tasty_cookie']).toBe('strawberry')
  })

  it('Should parse one signed cookie specified by name and return "false" for wrong signature', async () => {
    const secret = 'secret ingredient'
    const cookieString =
      'yummy_cookie=choco.UdFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie = strawberry.invalidsignatur%3D'
    const cookie: SignedCookie = await parseSigned(cookieString, secret, 'tasty_cookie')
    expect(cookie['yummy_cookie']).toBeUndefined()
    expect(cookie['tasty_cookie']).toBe(false)
  })

  it('Should parse signed cookies and ignore regular cookies', async () => {
    const secret = 'secret ingredient'
    const cookieString =
      'yummy_cookie=choco; tasty_cookie = strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D'
    const cookie: SignedCookie = await parseSigned(cookieString, secret)
    expect(cookie['yummy_cookie']).toBeUndefined()
    expect(cookie['tasty_cookie']).toBe('strawberry')
  })
})

describe('Set cookie', () => {
  it('Should serialize cookie', () => {
    const serialized = serialize('delicious_cookie', 'macha')
    expect(serialized).toBe('delicious_cookie=macha')
  })

  it('Should serialize cookie with all options', () => {
    const serialized = serialize('great_cookie', 'banana', {
      path: '/',
      secure: true,
      domain: 'example.com',
      httpOnly: true,
      maxAge: 1000,
      expires: new Date(Date.UTC(2000, 11, 24, 10, 30, 59, 900)),
      sameSite: 'Strict',
    })
    expect(serialized).toBe(
      'great_cookie=banana; Max-Age=1000; Domain=example.com; Path=/; Expires=Sun, 24 Dec 2000 10:30:59 GMT; HttpOnly; Secure; SameSite=Strict'
    )
  })

  it('Should serialize a signed cookie', async () => {
    const secret = 'secret chocolate chips'
    const serialized = await serializeSigned('delicious_cookie', 'macha', secret)
    expect(serialized).toBe(
      'delicious_cookie=macha.diubJPY8O7hI1pLa42QSfkPiyDWQ0I4DnlACH%2FN2HaA%3D'
    )
  })

  it('Should serialize singed cookie with all options', async () => {
    const secret = 'secret chocolate chips'
    const serialized = await serializeSigned('great_cookie', 'banana', secret, {
      path: '/',
      secure: true,
      domain: 'example.com',
      httpOnly: true,
      maxAge: 1000,
      expires: new Date(Date.UTC(2000, 11, 24, 10, 30, 59, 900)),
      sameSite: 'Strict',
    })
    expect(serialized).toBe(
      'great_cookie=banana.hSo6gB7YT2db0WBiEAakEmh7dtwEL0DSp76G23WvHuQ%3D; Max-Age=1000; Domain=example.com; Path=/; Expires=Sun, 24 Dec 2000 10:30:59 GMT; HttpOnly; Secure; SameSite=Strict'
    )
  })

  it('Should serialize cookie with maxAge is 0', () => {
    const serialized = serialize('great_cookie', 'banana', {
      maxAge: 0,
    })
    expect(serialized).toBe('great_cookie=banana; Max-Age=0')
  })

  it('Should serialize cookie with maxAge is -1', () => {
    const serialized = serialize('great_cookie', 'banana', {
      maxAge: -1,
    })
    expect(serialized).toBe('great_cookie=banana')
  })
})
