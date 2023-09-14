import type { Cookie, SignedCookie } from './cookie'
import { parse, parseSigned, serialize, serializeSigned } from './cookie'

describe('Parse cookie', () => {
  it('Should parse cookies', () => {
    const cookieString = 'yummy_cookie=choco; tasty_cookie = strawberry '
    const cookie: Cookie = parse(cookieString)
    expect(cookie['yummy_cookie']).toBe('choco')
    expect(cookie['tasty_cookie']).toBe('strawberry')
  })

  it('Should parse quoted cookie values', () => {
    const cookieString =
      'yummy_cookie="choco"; tasty_cookie = " strawberry " ; best_cookie="%20sugar%20";'
    const cookie: Cookie = parse(cookieString)
    expect(cookie['yummy_cookie']).toBe('choco')
    expect(cookie['tasty_cookie']).toBe(' strawberry ')
    expect(cookie['best_cookie']).toBe(' sugar ')
  })

  it('Should parse empty cookies', () => {
    const cookie: Cookie = parse('')
    expect(Object.keys(cookie).length).toBe(0)
  })

  it('Should parse one cookie specified by name', () => {
    const cookieString = 'yummy_cookie=choco; tasty_cookie = strawberry '
    const cookie: Cookie = parse(cookieString, 'yummy_cookie')
    expect(cookie['yummy_cookie']).toBe('choco')
    expect(cookie['tasty_cookie']).toBeUndefined()
  })

  it('Should parse cookies with no value', () => {
    const cookieString = 'yummy_cookie=; tasty_cookie = ; best_cookie= ; last_cookie=""'
    const cookie: Cookie = parse(cookieString)
    expect(cookie['yummy_cookie']).toBe('')
    expect(cookie['tasty_cookie']).toBe('')
    expect(cookie['best_cookie']).toBe('')
    expect(cookie['last_cookie']).toBe('')
  })

  it('Should parse cookies but not process signed cookies', () => {
    // also contains another cookie with a '.' in its value to test it is not misinterpreted as signed cookie
    const cookieString =
      'yummy_cookie=choco; tasty_cookie = strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D; great_cookie=rating3.5; best_cookie=sugar.valueShapedLikeASignatureButIsNotASignature%3D'
    const cookie: Cookie = parse(cookieString)
    expect(cookie['yummy_cookie']).toBe('choco')
    expect(cookie['tasty_cookie']).toBe('strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig=')
    expect(cookie['great_cookie']).toBe('rating3.5')
    expect(cookie['best_cookie']).toBe('sugar.valueShapedLikeASignatureButIsNotASignature=')
  })

  it('Should ignore invalid cookie names', () => {
    const cookieString = 'yummy_cookie=choco; tasty cookie=strawberry; best_cookie\\=sugar; =ng'
    const cookie: Cookie = parse(cookieString)
    expect(cookie['yummy_cookie']).toBe('choco')
    expect(cookie['tasty cookie']).toBeUndefined()
    expect(cookie['best_cookie\\']).toBeUndefined()
    expect(cookie['']).toBeUndefined()
  })

  it('Should ignore invalid cookie values', () => {
    const cookieString = 'yummy_cookie=choco\\nchip; tasty_cookie=strawberry; best_cookie="sugar'
    const cookie: Cookie = parse(cookieString)
    expect(cookie['yummy_cookie']).toBeUndefined()
    expect(cookie['tasty_cookie']).toBe('strawberry')
    expect(cookie['best_cookie\\']).toBeUndefined()
  })

  it('Should parse signed cookies', async () => {
    const secret = 'secret ingredient'
    const cookieString =
      'yummy_cookie=choco.UdFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie = strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D'
    const cookie: SignedCookie = await parseSigned(cookieString, secret)
    expect(cookie['yummy_cookie']).toBe('choco')
    expect(cookie['tasty_cookie']).toBe('strawberry')
  })

  it('Should parse signed cookies with binary secret', async () => {
    const secret = new Uint8Array([
      172, 142, 204, 63, 210, 136, 58, 143, 25, 18, 159, 16, 161, 34, 94,
    ])
    const cookieString =
      'yummy_cookie=choco.8Km4IwZETZdwiOfrT7KgYjKXwiO98XIkms0tOtRa2TA%3D; tasty_cookie = strawberry.TbV33P%2Bi1K0JTxMzNYq7FV9fB4s2VlQcBCBFDxTrUSg%3D'
    const cookie: SignedCookie = await parseSigned(cookieString, secret)
    expect(cookie['yummy_cookie']).toBe('choco')
    expect(cookie['tasty_cookie']).toBe('strawberry')
  })

  it('Should parse signed cookies containing the signature separator', async () => {
    const secret = 'secret ingredient'
    const cookieString = 'yummy_cookie=choco.chip.2%2FJA0c68Y3zm0DvSvHyR6IRysDWmHW0LfoaC0AkyOpw%3D'
    const cookie: SignedCookie = await parseSigned(cookieString, secret)
    expect(cookie['yummy_cookie']).toBe('choco.chip')
  })

  it('Should parse signed cookies and return "false" for wrong signature', async () => {
    const secret = 'secret ingredient'
    // tasty_cookie has invalid signature
    const cookieString =
      'yummy_cookie=choco.UdFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie = strawberry.LAa7RX43t2vCrLNcKmNG65H41OkyV02sraRPuY5RuVg%3D'
    const cookie: SignedCookie = await parseSigned(cookieString, secret)
    expect(cookie['yummy_cookie']).toBe('choco')
    expect(cookie['tasty_cookie']).toBe(false)
  })

  it('Should parse signed cookies and return "false" for corrupt signature', async () => {
    const secret = 'secret ingredient'
    // yummy_cookie has corrupt signature (i.e. invalid base64 encoding)
    // best_cookie has a shape that matches the signature format but isn't actually a signature
    const cookieString =
      'yummy_cookie=choco.?dFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie = strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D; best_cookie=sugar.valueShapedLikeASignatureButIsNotASignature%3D'
    const cookie: SignedCookie = await parseSigned(cookieString, secret)
    expect(cookie['yummy_cookie']).toBe(false)
    expect(cookie['tasty_cookie']).toBe('strawberry')
    expect(cookie['best_cookie']).toBe(false)
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
    // tasty_cookie has invalid signature
    const cookieString =
      'yummy_cookie=choco.UdFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie = strawberry.LAa7RX43t2vCrLNcKmNG65H41OkyV02sraRPuY5RuVg%3D'
    const cookie: SignedCookie = await parseSigned(cookieString, secret, 'tasty_cookie')
    expect(cookie['yummy_cookie']).toBeUndefined()
    expect(cookie['tasty_cookie']).toBe(false)
  })

  it('Should parse signed cookies and ignore regular cookies', async () => {
    const secret = 'secret ingredient'
    // also contains another cookie with a '.' in its value to test it is not misinterpreted as signed cookie
    const cookieString =
      'yummy_cookie=choco; tasty_cookie = strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D; great_cookie=rating3.5'
    const cookie: SignedCookie = await parseSigned(cookieString, secret)
    expect(cookie['yummy_cookie']).toBeUndefined()
    expect(cookie['tasty_cookie']).toBe('strawberry')
    expect(cookie['great_cookie']).toBeUndefined()
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
      partitioned: true,
    })
    expect(serialized).toBe(
      'great_cookie=banana; Max-Age=1000; Domain=example.com; Path=/; Expires=Sun, 24 Dec 2000 10:30:59 GMT; HttpOnly; Secure; SameSite=Strict; Partitioned'
    )
  })

  it('Should serialize a signed cookie', async () => {
    const secret = 'secret chocolate chips'
    const serialized = await serializeSigned('delicious_cookie', 'macha', secret)
    expect(serialized).toBe(
      'delicious_cookie=macha.diubJPY8O7hI1pLa42QSfkPiyDWQ0I4DnlACH%2FN2HaA%3D'
    )
  })

  it('Should serialize signed cookie with all options', async () => {
    const secret = 'secret chocolate chips'
    const serialized = await serializeSigned('great_cookie', 'banana', secret, {
      path: '/',
      secure: true,
      domain: 'example.com',
      httpOnly: true,
      maxAge: 1000,
      expires: new Date(Date.UTC(2000, 11, 24, 10, 30, 59, 900)),
      sameSite: 'Strict',
      partitioned: true,
    })
    expect(serialized).toBe(
      'great_cookie=banana.hSo6gB7YT2db0WBiEAakEmh7dtwEL0DSp76G23WvHuQ%3D; Max-Age=1000; Domain=example.com; Path=/; Expires=Sun, 24 Dec 2000 10:30:59 GMT; HttpOnly; Secure; SameSite=Strict; Partitioned'
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
