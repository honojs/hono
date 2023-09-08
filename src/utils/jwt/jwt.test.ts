/* eslint-disable @typescript-eslint/ban-ts-comment */
import { vi } from 'vitest'
import * as JWT from './jwt'
import {
  AlgorithmTypes,
  JwtAlgorithmNotImplemented,
  JwtTokenExpired,
  JwtTokenInvalid,
  JwtTokenIssuedAt,
  JwtTokenNotBefore,
  JwtTokenSignatureMismatched,
} from './types'

describe('JWT', () => {
  it('JwtAlgorithmNotImplemented', async () => {
    const payload = { message: 'hello world' }
    const secret = 'a-secret'
    const alg = ''
    let tok = ''
    let err: JwtAlgorithmNotImplemented
    try {
      tok = await JWT.sign(payload, secret, alg as AlgorithmTypes)
    } catch (e) {
      err = e as JwtAlgorithmNotImplemented
    }
    expect(tok).toBe('')
    // @ts-ignore
    expect(err).toEqual(new JwtAlgorithmNotImplemented(alg))
  })

  it('JwtTokenInvalid', async () => {
    const tok = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ'
    const secret = 'a-secret'
    let err: JwtTokenInvalid
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, AlgorithmTypes.HS256)
    } catch (e) {
      err = e as JwtTokenInvalid
    }
    // @ts-ignore
    expect(err).toEqual(new JwtTokenInvalid(tok))
    expect(authorized).toBeUndefined()
  })

  it('JwtTokenNotBefore', async () => {
    const tok =
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2NjQ2MDYzMzQsImV4cCI6MTY2NDYwOTkzNCwibmJmIjoiMzEwNDYwNjI2NCJ9.hpSDT_cfkxeiLWEpWVT8TDxFP3dFi27q1K7CcMcLXHc'
    const secret = 'a-secret'
    let err: JwtTokenNotBefore
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, AlgorithmTypes.HS256)
    } catch (e) {
      err = e as JwtTokenNotBefore
    }
    // @ts-ignore
    expect(err).toEqual(new JwtTokenNotBefore(tok))
    expect(authorized).toBeUndefined()
  })

  it('JwtTokenExpired', async () => {
    const tok =
      'eyJraWQiOiJFemF6bVZWbnd0TUpUNEFveFVtT0dILWJ0Y2VUVFM3djBYcEJuMm5ZZ2VjIiwiYWxnIjoiSFMyNTYifQ.eyJyb2xlIjoiYXBpX3JvbGUiLCJleHAiOjE2MzMwNDY0MDB9.Gmq_dozOnwzqkMUMEm7uny7cMZuF1d0QkCnmRXAbTEk'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, AlgorithmTypes.HS256)
    } catch (e) {
      err = e
    }
    expect(err).toEqual(new JwtTokenExpired(tok))
    expect(authorized).toBeUndefined()
  })

  it('JwtTokenIssuedAt', async () => {
    const now = 1633046400
    vi.useFakeTimers().setSystemTime(new Date().setTime(now * 1000))

    const iat = now + 1000 // after 1s
    const payload = { role: 'api_role', iat }
    const secret = 'a-secret'
    const tok = await JWT.sign(payload, secret, AlgorithmTypes.HS256)

    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, AlgorithmTypes.HS256)
    } catch (e) {
      err = e
    }
    expect(err).toEqual(new JwtTokenIssuedAt(now, iat))
    expect(authorized).toBeUndefined()
  })

  it('HS256 sign & verify & decode', async () => {
    const payload = { message: 'hello world' }
    const secret = 'a-secret'
    const tok = await JWT.sign(payload, secret, AlgorithmTypes.HS256)
    const expected =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.B54pAqIiLbu170tGQ1rY06Twv__0qSHTA0ioQPIOvFE'
    expect(tok).toEqual(expected)

    const verifiedPayload = await JWT.verify(tok, secret, AlgorithmTypes.HS256)
    expect(verifiedPayload).not.toBeUndefined()
    expect(verifiedPayload).toEqual(payload)

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
    let authorized
    try {
      authorized = await JWT.verify(tok, secret + 'invalid', AlgorithmTypes.HS256)
    } catch (e) {
      err = e
    }
    expect(authorized).toBeUndefined()
    expect(err instanceof JwtTokenSignatureMismatched).toBe(true)
  })

  it('HS512 sign & verify & decode', async () => {
    const payload = { message: 'hello world' }
    const secret = 'a-secret'
    const tok = await JWT.sign(payload, secret, AlgorithmTypes.HS512)
    const expected =
      'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.RqVLgExB_GXF1-9T-k4V4HjFmiuQKTEjVSiZd-YL0WERIlywZ7PfzAuTZSJU4gg8cscGamQa030cieEWrYcywg'
    expect(tok).toEqual(expected)

    const verifiedPayload = await JWT.verify(tok, secret, AlgorithmTypes.HS512)
    expect(verifiedPayload).not.toBeUndefined()
    expect(verifiedPayload).toEqual(payload)

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
    let authorized
    try {
      authorized = await JWT.verify(tok, secret + 'invalid', AlgorithmTypes.HS256)
    } catch (e) {
      err = e
    }
    expect(authorized).toBeUndefined()
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
    let authorized
    try {
      authorized = await JWT.verify(tok, secret + 'invalid', AlgorithmTypes.HS256)
    } catch (e) {
      err = e
    }
    expect(authorized).toBeUndefined()
    expect(err instanceof JwtTokenSignatureMismatched).toBe(true)
  })
})
