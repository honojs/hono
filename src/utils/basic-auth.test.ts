import { auth } from './basic-auth'

describe('auth', () => {
  it('auth() - not include Authorization Header', () => {
    const res = auth(new Request('http://localhost/auth'))
    expect(res).toBeUndefined()
  })

  it('auth() - invalid Authorization Header format', () => {
    const res = auth(
      new Request('http://localhost/auth', {
        headers: { Authorization: 'InvalidAuthHeader' },
      })
    )
    expect(res).toBeUndefined()
  })

  it('auth() - invalid Base64 string in Authorization Header', () => {
    const res = auth(
      new Request('http://localhost/auth', {
        headers: { Authorization: 'Basic InvalidBase64' },
      })
    )
    expect(res).toBeUndefined()
  })

  it('auth() - valid Authorization Header', () => {
    const validBase64 = btoa('username:password')
    const res = auth(
      new Request('http://localhost/auth', {
        headers: { Authorization: `Basic ${validBase64}` },
      })
    )
    expect(res).toEqual({ username: 'username', password: 'password' })
  })

  it('auth() - empty username', () => {
    const validBase64 = btoa(':password')
    const res = auth(
      new Request('http://localhost/auth', {
        headers: { Authorization: `Basic ${validBase64}` },
      })
    )
    expect(res).toEqual({ username: '', password: 'password' })
  })

  it('auth() - empty password', () => {
    const validBase64 = btoa('username:')
    const res = auth(
      new Request('http://localhost/auth', {
        headers: { Authorization: `Basic ${validBase64}` },
      })
    )
    expect(res).toEqual({ username: 'username', password: '' })
  })
})
