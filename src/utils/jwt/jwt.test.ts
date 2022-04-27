import * as JWT from './jwt'
import {
  AlgorithmTypes,
  JwtTokenSignatureMismatched,
  JwtAlorithmNotImplemented,
  JwtTokenInvalid,
  JwtTokenNotBefore,
  JwtTokenExpired,
} from './types'

describe('JWT', () => {
  it('JwtAlorithmNotImplemented', async () => {
    const payload = { message: 'hello world' }
    const secret = 'a-secret'
    const alg = ''
    let tok = ''
    let err: JwtAlorithmNotImplemented
    try {
      tok = await JWT.sign(payload, secret, alg as AlgorithmTypes)
    } catch (e) {
      err = e as JwtAlorithmNotImplemented
    }
    expect(tok).toBe('')
    expect(err).toEqual(new JwtAlorithmNotImplemented(alg))
  })

  it('JwtTokenInvalid', async () => {
    const tok = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ'
    const secret = 'a-secret'
    let err: JwtTokenInvalid
    let authorized = false
    try {
      authorized = await JWT.verify(tok, secret, AlgorithmTypes.HS256)
    } catch (e) {
      err = e as JwtTokenInvalid
    }
    expect(err).toEqual(new JwtTokenInvalid(tok))
    expect(authorized).toBe(false)
  })

  it.only('JwtTokenNotBefore', async () => {
    const tok = 'eyJraWQiOiJFemF7bVZWbnd0TUpUNEFveFVtT0dILWJ0Y2VUVFM3djBYcEJuMm5ZZ2VjIiwiYWxnIjoiSFMyNTYifQ.eyJyb2xlIjoiYXBpX3JvbGUiLCJuYmYiOjE2NjQ1ODI0MDB9.BatadbUj5e41OZ33odEFTAndQFzX0w9aAgpQPgO-zaQ'
    const secret = 'a-secret'
    let err: JwtTokenNotBefore
    let authorized = false
    try {
      authorized = await JWT.verify(tok, secret, AlgorithmTypes.HS256)
    } catch (e) {
      err = e as JwtTokenNotBefore
    }
    expect(err).toEqual(new JwtTokenNotBefore(tok))
    expect(authorized).toBe(false)
  })

  it('JwtTokenExpired', async () => {
    const tok = 'eyJraWQiOiJFemF6bVZWbnd0TUpUNEFveFVtT0dILWJ0Y2VUVFM3djBYcEJuMm5ZZ2VjIiwiYWxnIjoiSFMyNTYifQ.eyJyb2xlIjoiYXBpX3JvbGUiLCJleHAiOjE2MzMwNDY0MDB9.Gmq_dozOnwzqkMUMEm7uny7cMZuF1d0QkCnmRXAbTEk'
    const secret = 'a-secret'
    let err
    let authorized = false
    try {
      authorized = await JWT.verify(tok, secret, AlgorithmTypes.HS256)
    } catch (e) {
      err = e
    }
    expect(err).toEqual(new JwtTokenExpired(tok))
    expect(authorized).toBe(false)
  })

  it('HS256 sign & verify & decode', async () => {
    const payload = { message: 'hello world' }
    const secret = 'a-secret'
    const tok = await JWT.sign(payload, secret, AlgorithmTypes.HS256)
    const expected =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
    expect(tok).toEqual(expected)

    expect(await JWT.verify(tok, secret, AlgorithmTypes.HS256)).toBe(true)

    expect(JWT.decode(tok)).toEqual({
      header: {
        alg: 'HS256',
        typ: 'JWT',
      },
      payload: {
        message: 'hello world',
      },
    })
  })

  it('HS256 sign & verify', async () => {
    const payload = { message: 'hello world' }
    const secret = 'a-secret'
    const tok = await JWT.sign(payload, secret, AlgorithmTypes.HS256)
    const expected =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
    expect(tok).toEqual(expected)

    let err = null
    let authorized = false
    try {
      authorized = await JWT.verify(tok, secret + 'invalid', AlgorithmTypes.HS256)
    } catch (e) {
      err = e
    }
    expect(authorized).toBe(false)
    expect(err instanceof JwtTokenSignatureMismatched).toBe(true)
  })

  it('HS512 sign & verify & decode', async () => {
    const payload = { message: 'hello world' }
    const secret = 'a-secret'
    const tok = await JWT.sign(payload, secret, AlgorithmTypes.HS512)
    const expected =
      'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.RqVLgExB_GXF1-9T-k4V4HjFmiuQKTEjVSiZd-YL0WERIlywZ7PfzAuTZSJU4gg8cscGamQa030cieEWrYcywg'
    expect(tok).toEqual(expected)

    expect(await JWT.verify(tok, secret, AlgorithmTypes.HS512)).toBe(true)

    expect(JWT.decode(tok)).toEqual({
      header: {
        alg: 'HS512',
        typ: 'JWT',
      },
      payload: {
        message: 'hello world',
      },
    })
  })

  it('HS512 sign & verify', async () => {
    const payload = { message: 'hello world' }
    const secret = 'a-secret'
    const tok = await JWT.sign(payload, secret, AlgorithmTypes.HS512)
    const expected =
      'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.RqVLgExB_GXF1-9T-k4V4HjFmiuQKTEjVSiZd-YL0WERIlywZ7PfzAuTZSJU4gg8cscGamQa030cieEWrYcywg'
    expect(tok).toEqual(expected)

    let err = null
    let authorized = false
    try {
      authorized = await JWT.verify(tok, secret + 'invalid', AlgorithmTypes.HS256)
    } catch (e) {
      err = e
    }
    expect(authorized).toBe(false)
    expect(err instanceof JwtTokenSignatureMismatched).toBe(true)
  })

  it('HS384 sign & verify', async () => {
    const payload = { message: 'hello world' }
    const secret = 'a-secret%你好'
    const tok = await JWT.sign(payload, secret, AlgorithmTypes.HS384)
    const expected =
      'eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.C1Br1183Oy6O7th4NDCOaI9WB75i3FMCuYlv1tCL9HggsU89T-SNutghwhJykD3r'
    expect(tok).toEqual(expected)

    let err = null
    let authorized = false
    try {
      authorized = await JWT.verify(tok, secret + 'invalid', AlgorithmTypes.HS256)
    } catch (e) {
      err = e
    }
    expect(authorized).toBe(false)
    expect(err instanceof JwtTokenSignatureMismatched).toBe(true)
  })
})
