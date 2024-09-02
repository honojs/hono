import { HonoRequest } from '../request'
import { auth } from './basic-auth'

describe('auth', () => {
  it('auth() - not include Authorization Header', () => {
    const req = new HonoRequest(new Request('http://localhost/auth'))
    const res = auth(req)
    expect(res).toBeUndefined()
  })

  it('auth() - invalid Authorization Header format', () => {
    const req = new HonoRequest(
      new Request('http://localhost/auth', {
        headers: { Authorization: 'InvalidAuthHeader' },
      })
    )
    const res = auth(req)
    expect(res).toBeUndefined()
  })

  it('auth() - invalid Base64 string in Authorization Header', () => {
    const req = new HonoRequest(
      new Request('http://localhost/auth', {
        headers: { Authorization: 'Basic InvalidBase64' },
      })
    )
    const res = auth(req)
    expect(res).toBeUndefined()
  })

  it('auth() - valid Authorization Header', () => {
    const validBase64 = btoa('username:password')
    const req = new HonoRequest(
      new Request('http://localhost/auth', {
        headers: { Authorization: `Basic ${validBase64}` },
      })
    )
    const res = auth(req)
    expect(res).toEqual({ username: 'username', password: 'password' })
  })

  it('auth() - empty username', () => {
    const validBase64 = btoa(':password')
    const req = new HonoRequest(
      new Request('http://localhost/auth', {
        headers: { Authorization: `Basic ${validBase64}` },
      })
    )
    const res = auth(req)
    expect(res).toEqual({ username: '', password: 'password' })
  })

  it('auth() - empty password', () => {
    const validBase64 = btoa('username:')
    const req = new HonoRequest(
      new Request('http://localhost/auth', {
        headers: { Authorization: `Basic ${validBase64}` },
      })
    )
    const res = auth(req)
    expect(res).toEqual({ username: 'username', password: '' })
  })
})
