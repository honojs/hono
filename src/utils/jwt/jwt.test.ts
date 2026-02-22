/* eslint-disable @typescript-eslint/ban-ts-comment */
import { vi } from 'vitest'
import { encodeBase64, encodeBase64Url } from '../encode'
import { AlgorithmTypes } from './jwa'
import { signing } from './jws'
import * as JWT from './jwt'
import { verifyWithJwks } from './jwt'
import {
  JwtAlgorithmMismatch,
  JwtAlgorithmNotAllowed,
  JwtAlgorithmNotImplemented,
  JwtAlgorithmRequired,
  JwtPayloadRequiresAud,
  JwtSymmetricAlgorithmNotAllowed,
  JwtTokenAudience,
  JwtTokenExpired,
  JwtTokenInvalid,
  JwtTokenIssuedAt,
  JwtTokenIssuer,
  JwtTokenNotBefore,
  JwtTokenSignatureMismatched,
} from './types'
import { utf8Encoder } from './utf8'

describe('isTokenHeader', () => {
  it('should return true for valid TokenHeader', () => {
    const validTokenHeader: JWT.TokenHeader = {
      alg: AlgorithmTypes.HS256,
      typ: 'JWT',
    }

    expect(JWT.isTokenHeader(validTokenHeader)).toBe(true)
  })

  it('should return false for invalid TokenHeader', () => {
    const invalidTokenHeader = {
      alg: 'invalid',
      typ: 'JWT',
    }

    expect(JWT.isTokenHeader(invalidTokenHeader)).toBe(false)
  })

  it('returns true even if the typ field is absent in a TokenHeader', () => {
    const validTokenHeader: JWT.TokenHeader = {
      alg: AlgorithmTypes.HS256,
    }

    expect(JWT.isTokenHeader(validTokenHeader)).toBe(true)
  })

  it('returns false when the typ field is present but empty', () => {
    const invalidTokenHeader = {
      alg: AlgorithmTypes.HS256,
      typ: '',
    }

    expect(JWT.isTokenHeader(invalidTokenHeader)).toBe(false)
  })
})

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
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2MzMwNDYxMDAsImV4cCI6MTYzMzA0NjQwMH0.H-OI1TWAbmK8RonvcpPaQcNvOKS9sxinEOsgKwjoiVo'
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

  it('JwtTokenIssuer (none)', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MzMwNDY0MDB9.Ha3tPZzmnLGyFfZYd7GSV0iCn2F9kbZffFVZcTe5kJo'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        iss: 'some',
      })
    } catch (e) {
      err = e
    }
    expect(err).toEqual(new JwtTokenIssuer('some', null))
    expect(authorized).toBeUndefined()
  })

  it('JwtTokenIssuer (wrong - string)', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MzMwNDY0MDAsImlzcyI6ImZha2UtaXNzdWVyIn0.miyPU40DBvhxpAUsndssJOMBsP1aqc8JClGnriPHfXk'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        iss: 'expected-issuer',
      })
    } catch (e) {
      err = e
    }
    expect(err).toEqual(new JwtTokenIssuer('expected-issuer', 'fake-issuer'))
    expect(authorized).toBeUndefined()
  })

  it('JwtTokenIssuer (wrong - RegExp)', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MzMwNDY0MDAsImlzcyI6ImhleSJ9.Q0NJwoj-meWy42pFFrPNlREe2lOagWioJUjR4eJCx0k'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        iss: /^(hello|hi)$/,
      })
    } catch (e) {
      err = e
    }
    expect(err).toEqual(new JwtTokenIssuer(/^(hello|hi)$/, 'hey'))
    expect(authorized).toBeUndefined()
  })

  it('JwtTokenIssuer (correct - string)', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MzMwNDY0MDAsImlzcyI6ImNvcnJlY3QtaXNzdWVyIn0.gF8S6M2QcfTTscgxeyihNk28JAOa8mfL1bXPb3_E3rk'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        iss: 'correct-issuer',
      })
    } catch (e) {
      err = e
    }
    expect(err).toBeUndefined()
    expect(authorized?.iss).toEqual('correct-issuer')
  })

  it('JwtTokenIssuer (correct - RegExp)', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MzMwNDY0MDAsImlzcyI6ImhlbGxvIn0.5DDuValGGQu4EfS3DY7C4hwwHyTNSTD93K_YEjBzgAc'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        iss: /^(hello|hi)$/,
      })
    } catch (e) {
      err = e
    }
    expect(err).toBeUndefined()
    expect(authorized?.iss).toEqual('hello')
  })

  it('JwtPayloadRequireAud', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiaWF0IjoxfQ.3Yd0dDicCKA6zu_G6AvxMX_fRH5wMz9gMCedOsYNAGc'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        aud: 'correct-audience',
      })
    } catch (e) {
      err = e
    }
    expect(err).toEqual(new JwtPayloadRequiresAud({ iss: 'https://issuer.example', iat: 1 }))
    expect(authorized).toBeUndefined()
  })

  it('JwtTokenAudience(correct string - string)', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjoiY29ycmVjdC1hdWRpZW5jZSIsImlhdCI6MX0.z8T6szX-k66de4xB9OFbpWAOfx0RTqKSUPBcdpSY5nk'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        aud: 'correct-audience',
      })
    } catch (e) {
      err = e
    }
    expect(err).toBeUndefined()
    expect(authorized?.aud).toEqual('correct-audience')
  })

  it('JwtTokenAudience(correct string - string[])', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjoiY29ycmVjdC1hdWRpZW5jZSIsImlhdCI6MX0.z8T6szX-k66de4xB9OFbpWAOfx0RTqKSUPBcdpSY5nk'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        aud: ['correct-audience', 'other-audience'],
      })
    } catch (e) {
      err = e
    }
    expect(err).toBeUndefined()
    expect(authorized?.aud).toEqual('correct-audience')
  })

  it('JwtTokenAudience(correct string - RegExp)', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjoiY29ycmVjdC1hdWRpZW5jZSIsImlhdCI6MX0.z8T6szX-k66de4xB9OFbpWAOfx0RTqKSUPBcdpSY5nk'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        aud: /^correct-audience$/,
      })
    } catch (e) {
      err = e
    }
    expect(err).toBeUndefined()
    expect(authorized?.aud).toEqual('correct-audience')
  })

  it('JwtTokenAudience(correct string[] - string)', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjpbImNvcnJlY3QtYXVkaWVuY2UiLCJvdGhlci1hdWRpZW5jZSJdLCJpYXQiOjF9.l73pNR5zMMAyuoN3f32hKtRJkoxZNzgTcVBZ2A2EsJY'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        aud: 'correct-audience',
      })
    } catch (e) {
      err = e
    }
    expect(err).toBeUndefined()
    expect(authorized?.aud).toEqual(['correct-audience', 'other-audience'])
  })

  it('JwtTokenAudience(correct string[] - string[])', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjpbImNvcnJlY3QtYXVkaWVuY2UiLCJvdGhlci1hdWRpZW5jZSJdLCJpYXQiOjF9.l73pNR5zMMAyuoN3f32hKtRJkoxZNzgTcVBZ2A2EsJY'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        aud: ['correct-audience', 'test'],
      })
    } catch (e) {
      err = e
    }
    expect(err).toBeUndefined()
    expect(authorized?.aud).toEqual(['correct-audience', 'other-audience'])
  })

  it('JwtTokenAudience(correct string[] - RegExp)', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjpbImNvcnJlY3QtYXVkaWVuY2UiLCJvdGhlci1hdWRpZW5jZSJdLCJpYXQiOjF9.l73pNR5zMMAyuoN3f32hKtRJkoxZNzgTcVBZ2A2EsJY'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        aud: /^correct-audience$/,
      })
    } catch (e) {
      err = e
    }
    expect(err).toBeUndefined()
    expect(authorized?.aud).toEqual(['correct-audience', 'other-audience'])
  })

  it('JwtTokenAudience(wrong string - string)', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjoid3JvbmctYXVkaWVuY2UiLCJpYXQiOjF9.2vTYLiYL5r6qN-iRQ0VSfXh4ioLFtNzo0qc-OoPZmow'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        aud: 'correct-audience',
      })
    } catch (e) {
      err = e
    }
    expect(err).toEqual(new JwtTokenAudience('correct-audience', 'wrong-audience'))
    expect(authorized).toBeUndefined()
  })

  it('JwtTokenAudience(wrong string - string[])', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjoid3JvbmctYXVkaWVuY2UiLCJpYXQiOjF9.2vTYLiYL5r6qN-iRQ0VSfXh4ioLFtNzo0qc-OoPZmow'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        aud: ['correct-audience', 'other-audience'],
      })
    } catch (e) {
      err = e
    }
    expect(err).toEqual(
      new JwtTokenAudience(['correct-audience', 'other-audience'], 'wrong-audience')
    )
    expect(authorized).toBeUndefined()
  })

  it('JwtTokenAudience(wrong string - RegExp)', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjoid3JvbmctYXVkaWVuY2UiLCJpYXQiOjF9.2vTYLiYL5r6qN-iRQ0VSfXh4ioLFtNzo0qc-OoPZmow'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        aud: /^correct-audience$/,
      })
    } catch (e) {
      err = e
    }
    expect(err).toEqual(new JwtTokenAudience(/^correct-audience$/, 'wrong-audience'))
    expect(authorized).toBeUndefined()
  })

  it('JwtTokenAudience(wrong string[] - string)', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjpbIndyb25nLWF1ZGllbmNlIiwib3RoZXItYXVkaWVuY2UiXSwiaWF0IjoxfQ.YTAM1xtKP4AeEeQSFQ81rcJM1leW_uDayQcTE6LxoP0'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        aud: 'correct-audience',
      })
    } catch (e) {
      err = e
    }
    expect(err).toEqual(
      new JwtTokenAudience('correct-audience', ['wrong-audience', 'other-audience'])
    )
    expect(authorized).toBeUndefined()
  })

  it('JwtTokenAudience(wrong string[] - string[])', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjpbIndyb25nLWF1ZGllbmNlIiwib3RoZXItYXVkaWVuY2UiXSwiaWF0IjoxfQ.YTAM1xtKP4AeEeQSFQ81rcJM1leW_uDayQcTE6LxoP0'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        aud: ['correct-audience', 'test'],
      })
    } catch (e) {
      err = e
    }
    expect(err).toEqual(
      new JwtTokenAudience(['correct-audience', 'test'], ['wrong-audience', 'other-audience'])
    )
    expect(authorized).toBeUndefined()
  })

  it('JwtTokenAudience(wrong string[] - RegExp)', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjpbIndyb25nLWF1ZGllbmNlIiwib3RoZXItYXVkaWVuY2UiXSwiaWF0IjoxfQ.YTAM1xtKP4AeEeQSFQ81rcJM1leW_uDayQcTE6LxoP0'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
        aud: /^correct-audience$/,
      })
    } catch (e) {
      err = e
    }
    expect(err).toEqual(
      new JwtTokenAudience(/^correct-audience$/, ['wrong-audience', 'other-audience'])
    )
    expect(authorized).toBeUndefined()
  })

  it('JwtTokenAudience (no aud option and wrong aud in payload)', async () => {
    const tok =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjoid3JvbmctYXVkaWVuY2UiLCJpYXQiOjF9.2vTYLiYL5r6qN-iRQ0VSfXh4ioLFtNzo0qc-OoPZmow'
    const secret = 'a-secret'
    let err
    let authorized
    try {
      authorized = await JWT.verify(tok, secret, {
        alg: AlgorithmTypes.HS256,
      })
    } catch (e) {
      err = e
    }
    expect(err).toBeUndefined()
    expect(authorized?.aud).toEqual('wrong-audience')
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
      authorized = await JWT.verify(tok, secret + 'invalid', AlgorithmTypes.HS512)
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
      authorized = await JWT.verify(tok, secret + 'invalid', AlgorithmTypes.HS384)
    } catch (e) {
      err = e
    }
    expect(authorized).toBeUndefined()
    expect(err instanceof JwtTokenSignatureMismatched).toBe(true)
  })

  it('sign & verify & decode with a custom secret', async () => {
    const payload = { message: 'hello world' }
    const algorithm = {
      name: 'HMAC',
      hash: {
        name: 'SHA-256',
      },
    }
    const secret = await crypto.subtle.importKey(
      'raw',
      Buffer.from('cefb73234d5fae4bf27662900732b52943e8d53e871fe0f353da95de4599c21d', 'hex'),
      algorithm,
      false,
      ['sign', 'verify']
    )
    const tok = await JWT.sign(payload, secret)
    const expected =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8gd29ybGQifQ.qunGhchNXH_unqWXN6hB0Elhzr5SykSXVhklLti1aFI'
    expect(tok).toEqual(expected)

    const verifiedPayload = await JWT.verify(tok, secret, AlgorithmTypes.HS256)
    expect(verifiedPayload).not.toBeUndefined()
    expect(verifiedPayload).toEqual(payload)

    const invalidSecret = await crypto.subtle.importKey(
      'raw',
      Buffer.from('cefb73234d5fae4bf27662900732b52943e8d53e871fe0f353da95de41111111', 'hex'),
      algorithm,
      false,
      ['sign', 'verify']
    )
    let err = null
    let authorized
    try {
      authorized = await JWT.verify(tok, invalidSecret, AlgorithmTypes.HS256)
    } catch (e) {
      err = e
    }
    expect(authorized).toBeUndefined()
    expect(err instanceof JwtTokenSignatureMismatched).toBe(true)
  })

  const rsTestCases = [
    {
      alg: AlgorithmTypes.RS256,
      hash: 'SHA-256',
    },
    {
      alg: AlgorithmTypes.RS384,
      hash: 'SHA-384',
    },
    {
      alg: AlgorithmTypes.RS512,
      hash: 'SHA-512',
    },
  ]
  for (const tc of rsTestCases) {
    it(`${tc.alg} sign & verify`, async () => {
      const alg = tc.alg
      const payload = { message: 'hello world' }
      const keyPair = await generateRSAKey(tc.hash)
      const pemPrivateKey = await exportPEMPrivateKey(keyPair.privateKey)
      const pemPublicKey = await exportPEMPublicKey(keyPair.publicKey)
      const jwkPublicKey = await exportJWK(keyPair.publicKey)

      const tok = await JWT.sign(payload, pemPrivateKey, alg)
      expect(await JWT.verify(tok, pemPublicKey, alg)).toEqual(payload)
      expect(await JWT.verify(tok, pemPrivateKey, alg)).toEqual(payload)
      expect(await JWT.verify(tok, jwkPublicKey, alg)).toEqual(payload)

      const keyPair2 = await generateRSAKey(tc.hash)
      const unexpectedPemPublicKey = await exportPEMPublicKey(keyPair2.publicKey)

      let err = null
      let authorized
      try {
        authorized = await JWT.verify(tok, unexpectedPemPublicKey, alg)
      } catch (e) {
        err = e
      }
      expect(authorized).toBeUndefined()
      expect(err instanceof JwtTokenSignatureMismatched).toBe(true)
    })

    it(`${tc.alg} sign & verify w/ CryptoKey`, async () => {
      const alg = tc.alg
      const payload = { message: 'hello world' }
      const keyPair = await generateRSAKey(tc.hash)

      const tok = await JWT.sign(payload, keyPair.privateKey, alg)
      expect(await JWT.verify(tok, keyPair.privateKey, alg)).toEqual(payload)
      expect(await JWT.verify(tok, keyPair.publicKey, alg)).toEqual(payload)
    })
  }

  const psTestCases = [
    {
      alg: AlgorithmTypes.PS256,
      hash: 'SHA-256',
    },
    {
      alg: AlgorithmTypes.PS384,
      hash: 'SHA-384',
    },
    {
      alg: AlgorithmTypes.PS512,
      hash: 'SHA-512',
    },
  ]
  for (const tc of psTestCases) {
    it(`${tc.alg} sign & verify`, async () => {
      const alg = tc.alg
      const payload = { message: 'hello world' }
      const keyPair = await generateRSAPSSKey(tc.hash)
      const pemPrivateKey = await exportPEMPrivateKey(keyPair.privateKey)
      const pemPublicKey = await exportPEMPublicKey(keyPair.publicKey)
      const jwkPublicKey = await exportJWK(keyPair.publicKey)

      const tok = await JWT.sign(payload, pemPrivateKey, alg)
      expect(await JWT.verify(tok, pemPublicKey, alg)).toEqual(payload)
      expect(await JWT.verify(tok, pemPrivateKey, alg)).toEqual(payload)
      expect(await JWT.verify(tok, jwkPublicKey, alg)).toEqual(payload)

      const keyPair2 = await generateRSAPSSKey(tc.hash)
      const unexpectedPemPublicKey = await exportPEMPublicKey(keyPair2.publicKey)

      let err = null
      let authorized
      try {
        authorized = await JWT.verify(tok, unexpectedPemPublicKey, alg)
      } catch (e) {
        err = e
      }
      expect(authorized).toBeUndefined()
      expect(err instanceof JwtTokenSignatureMismatched).toBe(true)
    })

    it(`${tc.alg} sign & verify w/ CryptoKey`, async () => {
      const alg = tc.alg
      const payload = { message: 'hello world' }
      const keyPair = await generateRSAPSSKey(tc.hash)

      const tok = await JWT.sign(payload, keyPair.privateKey, alg)
      expect(await JWT.verify(tok, keyPair.privateKey, alg)).toEqual(payload)
      expect(await JWT.verify(tok, keyPair.publicKey, alg)).toEqual(payload)
    })
  }

  const esTestCases = [
    {
      alg: AlgorithmTypes.ES256,
      namedCurve: 'P-256',
    },
    {
      alg: AlgorithmTypes.ES384,
      namedCurve: 'P-384',
    },
    {
      alg: AlgorithmTypes.ES512,
      namedCurve: 'P-521',
    },
  ]
  for (const tc of esTestCases) {
    it(`${tc.alg} sign & verify`, async () => {
      const alg = tc.alg
      const payload = { message: 'hello world' }
      const keyPair = await generateECDSAKey(tc.namedCurve)
      const pemPrivateKey = await exportPEMPrivateKey(keyPair.privateKey)
      const pemPublicKey = await exportPEMPublicKey(keyPair.publicKey)
      const jwkPublicKey = await exportJWK(keyPair.publicKey)

      const tok = await JWT.sign(payload, pemPrivateKey, alg)
      expect(await JWT.verify(tok, pemPublicKey, alg)).toEqual(payload)
      expect(await JWT.verify(tok, pemPrivateKey, alg)).toEqual(payload)
      expect(await JWT.verify(tok, jwkPublicKey, alg)).toEqual(payload)

      const keyPair2 = await generateECDSAKey(tc.namedCurve)
      const unexpectedPemPublicKey = await exportPEMPublicKey(keyPair2.publicKey)

      let err = null
      let authorized
      try {
        authorized = await JWT.verify(tok, unexpectedPemPublicKey, alg)
      } catch (e) {
        err = e
      }
      expect(authorized).toBeUndefined()
      expect(err instanceof JwtTokenSignatureMismatched).toBe(true)
    })

    it(`${tc.alg} sign & verify w/ CryptoKey`, async () => {
      const alg = tc.alg
      const payload = { message: 'hello world' }
      const keyPair = await generateECDSAKey(tc.namedCurve)

      const tok = await JWT.sign(payload, keyPair.privateKey, alg)
      expect(await JWT.verify(tok, keyPair.privateKey, alg)).toEqual(payload)
      expect(await JWT.verify(tok, keyPair.publicKey, alg)).toEqual(payload)
    })
  }

  it('EdDSA sign & verify', async () => {
    const alg = 'EdDSA'
    const payload = { message: 'hello world' }
    const keyPair = await generateEd25519Key()
    const pemPrivateKey = await exportPEMPrivateKey(keyPair.privateKey)
    const pemPublicKey = await exportPEMPublicKey(keyPair.publicKey)
    const jwkPublicKey = await exportJWK(keyPair.publicKey)

    const tok = await JWT.sign(payload, pemPrivateKey, alg)
    expect(await JWT.verify(tok, pemPublicKey, alg)).toEqual(payload)
    expect(await JWT.verify(tok, pemPrivateKey, alg)).toEqual(payload)
    expect(await JWT.verify(tok, jwkPublicKey, alg)).toEqual(payload)

    const keyPair2 = await generateEd25519Key()
    const unexpectedPemPublicKey = await exportPEMPublicKey(keyPair2.publicKey)

    let err = null
    let authorized
    try {
      authorized = await JWT.verify(tok, unexpectedPemPublicKey, alg)
    } catch (e) {
      err = e
    }
    expect(authorized).toBeUndefined()
    expect(err instanceof JwtTokenSignatureMismatched).toBe(true)
  })

  it('EdDSA sign & verify w/ CryptoKey', async () => {
    const alg = 'EdDSA'
    const payload = { message: 'hello world' }
    const keyPair = await generateEd25519Key()

    const tok = await JWT.sign(payload, keyPair.privateKey, alg)
    expect(await JWT.verify(tok, keyPair.privateKey, alg)).toEqual(payload)
    expect(await JWT.verify(tok, keyPair.publicKey, alg)).toEqual(payload)
  })
})

describe('verifyWithJwks header.alg fallback', () => {
  it('Should use header.alg as fallback when matchingKey.alg is missing', async () => {
    // Setup: Create a JWT signed with RS256 (asymmetric algorithm)
    const payload = { message: 'hello world' }
    const headerAlg = 'RS256'
    const kid = 'dummy'

    // Generate RSA key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    )

    // Create JWT (signed with RS256)
    const header = { alg: headerAlg, typ: 'JWT', kid }
    const encode = (obj: object) => encodeBase64Url(utf8Encoder.encode(JSON.stringify(obj)).buffer)
    const encodedHeader = encode(header)
    const encodedPayload = encode(payload)
    const signingInput = `${encodedHeader}.${encodedPayload}`

    // Sign with private key
    const signatureBuffer = await signing(
      keyPair.privateKey,
      headerAlg,
      utf8Encoder.encode(signingInput)
    )
    const signature = encodeBase64Url(signatureBuffer)

    const token = `${encodedHeader}.${encodedPayload}.${signature}`

    // Export public key as JWK without alg property
    const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
    const keyWithoutAlg = {
      ...jwk,
      kid,
      use: 'sig',
    }
    delete keyWithoutAlg.alg // intentionally omit alg

    const keys = [keyWithoutAlg]

    // Execute: Verify the JWT token signed with RS256 with allowedAlgorithms required
    const result = await verifyWithJwks(token, { keys, allowedAlgorithms: ['RS256'] })

    // If verification succeeds, it means header.alg was used
    expect(result).toEqual(payload)
  })
})

describe('verifyWithJwks security', () => {
  it('Should reject symmetric algorithm HS256', async () => {
    const payload = { message: 'hello world' }
    const secret = 'secret'
    const kid = 'dummy'

    // Create JWT (signed with HS256)
    const header = { alg: 'HS256', typ: 'JWT', kid }
    const encode = (obj: object) => encodeBase64Url(utf8Encoder.encode(JSON.stringify(obj)).buffer)
    const encodedHeader = encode(header)
    const encodedPayload = encode(payload)
    const signingInput = `${encodedHeader}.${encodedPayload}`

    const signatureBuffer = await signing(secret, 'HS256', utf8Encoder.encode(signingInput))
    const signature = encodeBase64Url(signatureBuffer)

    const token = `${encodedHeader}.${encodedPayload}.${signature}`

    const keys = [
      {
        kty: 'oct',
        kid,
        k: encodeBase64Url(utf8Encoder.encode(secret).buffer),
        use: 'sig',
        alg: 'HS256',
      },
    ]

    // HS256 is rejected before allowedAlgorithms check (symmetric algorithm rejection)
    await expect(verifyWithJwks(token, { keys, allowedAlgorithms: ['RS256'] })).rejects.toThrow(
      JwtSymmetricAlgorithmNotAllowed
    )
  })

  it('Should reject symmetric algorithm HS384', async () => {
    const payload = { message: 'hello world' }
    const secret = 'secret'
    const kid = 'dummy'

    const header = { alg: 'HS384', typ: 'JWT', kid }
    const encode = (obj: object) => encodeBase64Url(utf8Encoder.encode(JSON.stringify(obj)).buffer)
    const encodedHeader = encode(header)
    const encodedPayload = encode(payload)
    const signingInput = `${encodedHeader}.${encodedPayload}`

    const signatureBuffer = await signing(secret, 'HS384', utf8Encoder.encode(signingInput))
    const signature = encodeBase64Url(signatureBuffer)

    const token = `${encodedHeader}.${encodedPayload}.${signature}`

    const keys = [
      {
        kty: 'oct',
        kid,
        k: encodeBase64Url(utf8Encoder.encode(secret).buffer),
        use: 'sig',
        alg: 'HS384',
      },
    ]

    // HS384 is rejected before allowedAlgorithms check (symmetric algorithm rejection)
    await expect(verifyWithJwks(token, { keys, allowedAlgorithms: ['RS256'] })).rejects.toThrow(
      JwtSymmetricAlgorithmNotAllowed
    )
  })

  it('Should reject symmetric algorithm HS512', async () => {
    const payload = { message: 'hello world' }
    const secret = 'secret'
    const kid = 'dummy'

    const header = { alg: 'HS512', typ: 'JWT', kid }
    const encode = (obj: object) => encodeBase64Url(utf8Encoder.encode(JSON.stringify(obj)).buffer)
    const encodedHeader = encode(header)
    const encodedPayload = encode(payload)
    const signingInput = `${encodedHeader}.${encodedPayload}`

    const signatureBuffer = await signing(secret, 'HS512', utf8Encoder.encode(signingInput))
    const signature = encodeBase64Url(signatureBuffer)

    const token = `${encodedHeader}.${encodedPayload}.${signature}`

    const keys = [
      {
        kty: 'oct',
        kid,
        k: encodeBase64Url(utf8Encoder.encode(secret).buffer),
        use: 'sig',
        alg: 'HS512',
      },
    ]

    // HS512 is rejected before allowedAlgorithms check (symmetric algorithm rejection)
    await expect(verifyWithJwks(token, { keys, allowedAlgorithms: ['RS256'] })).rejects.toThrow(
      JwtSymmetricAlgorithmNotAllowed
    )
  })

  it('Should reject algorithm mismatch between JWK and JWT header', async () => {
    const payload = { message: 'hello world' }
    const kid = 'dummy'

    // Generate RS256 key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    )

    // Create JWT with RS384 in header (mismatch with RS256 key)
    const header = { alg: 'RS384', typ: 'JWT', kid }
    const encode = (obj: object) => encodeBase64Url(utf8Encoder.encode(JSON.stringify(obj)).buffer)
    const encodedHeader = encode(header)
    const encodedPayload = encode(payload)
    const signingInput = `${encodedHeader}.${encodedPayload}`

    // Sign with RS256 key (but header says RS384)
    const signatureBuffer = await signing(
      keyPair.privateKey,
      'RS256',
      utf8Encoder.encode(signingInput)
    )
    const signature = encodeBase64Url(signatureBuffer)

    const token = `${encodedHeader}.${encodedPayload}.${signature}`

    // Export public key as JWK with RS256 alg
    const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
    const keyWithAlg = {
      ...jwk,
      kid,
      use: 'sig',
      alg: 'RS256', // JWK says RS256, but header says RS384
    }

    const keys = [keyWithAlg]

    // RS384 in header doesn't match RS256 in JWK alg field
    await expect(verifyWithJwks(token, { keys, allowedAlgorithms: ['RS384'] })).rejects.toThrow(
      JwtAlgorithmMismatch
    )
  })

  it('Should allow asymmetric algorithm RS256 with matching alg', async () => {
    const payload = { message: 'hello world' }
    const kid = 'dummy'

    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    )

    const header = { alg: 'RS256', typ: 'JWT', kid }
    const encode = (obj: object) => encodeBase64Url(utf8Encoder.encode(JSON.stringify(obj)).buffer)
    const encodedHeader = encode(header)
    const encodedPayload = encode(payload)
    const signingInput = `${encodedHeader}.${encodedPayload}`

    const signatureBuffer = await signing(
      keyPair.privateKey,
      'RS256',
      utf8Encoder.encode(signingInput)
    )
    const signature = encodeBase64Url(signatureBuffer)

    const token = `${encodedHeader}.${encodedPayload}.${signature}`

    const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
    const keyWithAlg = {
      ...jwk,
      kid,
      use: 'sig',
      alg: 'RS256',
    }

    const keys = [keyWithAlg]

    const result = await verifyWithJwks(token, { keys, allowedAlgorithms: ['RS256'] })
    expect(result).toEqual(payload)
  })

  it('Should reject algorithm confusion attack (HS256 with RSA public key)', async () => {
    // This test simulates the algorithm confusion attack where an attacker
    // tries to use HS256 with a public RSA key as the HMAC secret
    const payload = { message: 'hello world' }
    const kid = 'dummy'

    // Generate RSA key pair (normally used for RS256)
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    )

    // Attacker creates a JWT with HS256 in header
    const header = { alg: 'HS256', typ: 'JWT', kid }
    const encode = (obj: object) => encodeBase64Url(utf8Encoder.encode(JSON.stringify(obj)).buffer)
    const encodedHeader = encode(header)
    const encodedPayload = encode(payload)
    const signingInput = `${encodedHeader}.${encodedPayload}`

    // Export public key as JWK (which would be used in a real attack)
    const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)

    // Attacker would sign with the public key bytes as HMAC secret
    // We don't need to actually sign for this test - just verify rejection
    const signatureBuffer = await signing('fake-secret', 'HS256', utf8Encoder.encode(signingInput))
    const signature = encodeBase64Url(signatureBuffer)

    const token = `${encodedHeader}.${encodedPayload}.${signature}`

    // JWK has RS256 alg, but JWT header has HS256 (confusion attack)
    const keyWithAlg = {
      ...jwk,
      kid,
      use: 'sig',
      alg: 'RS256',
    }

    const keys = [keyWithAlg]

    // Should reject because HS256 is a symmetric algorithm (checked before allowedAlgorithms)
    await expect(verifyWithJwks(token, { keys, allowedAlgorithms: ['RS256'] })).rejects.toThrow(
      JwtSymmetricAlgorithmNotAllowed
    )
  })
})

describe('verifyWithJwks algorithm whitelist', () => {
  it('Should reject algorithm not in whitelist', async () => {
    const payload = { message: 'hello world' }
    const kid = 'dummy'

    // Generate RS256 key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    )

    // Create JWT with RS256
    const header = { alg: 'RS256', typ: 'JWT', kid }
    const encode = (obj: object) => encodeBase64Url(utf8Encoder.encode(JSON.stringify(obj)).buffer)
    const encodedHeader = encode(header)
    const encodedPayload = encode(payload)
    const signingInput = `${encodedHeader}.${encodedPayload}`

    const signatureBuffer = await signing(
      keyPair.privateKey,
      'RS256',
      utf8Encoder.encode(signingInput)
    )
    const signature = encodeBase64Url(signatureBuffer)

    const token = `${encodedHeader}.${encodedPayload}.${signature}`

    const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
    const keyWithAlg = {
      ...jwk,
      kid,
      use: 'sig',
      alg: 'RS256',
    }

    const keys = [keyWithAlg]

    // RS256 is not in the whitelist (only ES256 is allowed)
    await expect(verifyWithJwks(token, { keys, allowedAlgorithms: ['ES256'] })).rejects.toThrow(
      JwtAlgorithmNotAllowed
    )
  })

  it('Should accept algorithm in whitelist', async () => {
    const payload = { message: 'hello world' }
    const kid = 'dummy'

    // Generate RS256 key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    )

    // Create JWT with RS256
    const header = { alg: 'RS256', typ: 'JWT', kid }
    const encode = (obj: object) => encodeBase64Url(utf8Encoder.encode(JSON.stringify(obj)).buffer)
    const encodedHeader = encode(header)
    const encodedPayload = encode(payload)
    const signingInput = `${encodedHeader}.${encodedPayload}`

    const signatureBuffer = await signing(
      keyPair.privateKey,
      'RS256',
      utf8Encoder.encode(signingInput)
    )
    const signature = encodeBase64Url(signatureBuffer)

    const token = `${encodedHeader}.${encodedPayload}.${signature}`

    const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
    const keyWithAlg = {
      ...jwk,
      kid,
      use: 'sig',
      alg: 'RS256',
    }

    const keys = [keyWithAlg]

    // RS256 is in the whitelist
    const result = await verifyWithJwks(token, { keys, allowedAlgorithms: ['RS256', 'ES256'] })
    expect(result).toEqual(payload)
  })

  // Note: Tests for "whitelist not specified" and "empty whitelist" were removed
  // because allowedAlgorithms is now required (not optional).
  // This is a breaking change that enforces explicit algorithm specification for security.

  it('Should reject symmetric algorithm (HS256) in JWT header', async () => {
    // This test verifies that symmetric algorithms are rejected even when
    // using verifyWithJwks with asymmetric algorithm whitelist.
    // Note: HS256 cannot be added to allowedAlgorithms due to type constraints (AsymmetricAlgorithm[])
    const payload = { message: 'hello world' }
    const secret = 'secret'
    const kid = 'dummy'

    // Create JWT with HS256
    const header = { alg: 'HS256', typ: 'JWT', kid }
    const encode = (obj: object) => encodeBase64Url(utf8Encoder.encode(JSON.stringify(obj)).buffer)
    const encodedHeader = encode(header)
    const encodedPayload = encode(payload)
    const signingInput = `${encodedHeader}.${encodedPayload}`

    const signatureBuffer = await signing(secret, 'HS256', utf8Encoder.encode(signingInput))
    const signature = encodeBase64Url(signatureBuffer)

    const token = `${encodedHeader}.${encodedPayload}.${signature}`

    const keys = [
      {
        kty: 'oct',
        kid,
        k: encodeBase64Url(utf8Encoder.encode(secret).buffer),
        use: 'sig',
        alg: 'HS256',
      },
    ]

    // HS256 in JWT header should be rejected as symmetric algorithm
    // (symmetric algorithm check happens before allowedAlgorithms check)
    await expect(verifyWithJwks(token, { keys, allowedAlgorithms: ['RS256'] })).rejects.toThrow(
      JwtSymmetricAlgorithmNotAllowed
    )
  })
})

async function exportPEMPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('pkcs8', key)
  const pem = `-----BEGIN PRIVATE KEY-----\n${encodeBase64(exported)}\n-----END PRIVATE KEY-----`
  return pem
}

async function exportPEMPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', key)
  const pem = `-----BEGIN PUBLIC KEY-----\n${encodeBase64(exported)}\n-----END PUBLIC KEY-----`
  return pem
}

async function exportJWK(key: CryptoKey): Promise<JsonWebKey> {
  return await crypto.subtle.exportKey('jwk', key)
}

async function generateRSAKey(hash: string): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      hash,
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      name: 'RSASSA-PKCS1-v1_5',
    },
    true,
    ['sign', 'verify']
  )
}

async function generateRSAPSSKey(hash: string): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      hash,
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      name: 'RSA-PSS',
    },
    true,
    ['sign', 'verify']
  )
}

async function generateECDSAKey(namedCurve: string): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve,
    },
    true,
    ['sign', 'verify']
  )
}

async function generateEd25519Key(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    },
    true,
    ['sign', 'verify']
  )
}

describe('Security: Algorithm Confusion Attack Prevention', () => {
  it('Should throw JwtAlgorithmRequired error when alg is not specified in verify()', async () => {
    const payload = { message: 'hello world' }
    const secret = 'a-secret'
    const tok = await JWT.sign(payload, secret, AlgorithmTypes.HS256)

    let err: JwtAlgorithmRequired | undefined
    let authorized
    try {
      // @ts-expect-error - intentionally testing without alg parameter
      authorized = await JWT.verify(tok, secret)
    } catch (e) {
      err = e as JwtAlgorithmRequired
    }
    expect(err).toBeInstanceOf(JwtAlgorithmRequired)
    expect(err?.message).toBe('JWT verification requires "alg" option to be specified')
    expect(authorized).toBeUndefined()
  })

  it('Should throw JwtAlgorithmRequired error when alg is undefined in options object', async () => {
    const payload = { message: 'hello world' }
    const secret = 'a-secret'
    const tok = await JWT.sign(payload, secret, AlgorithmTypes.HS256)

    let err: JwtAlgorithmRequired | undefined
    let authorized
    try {
      // @ts-expect-error - intentionally testing with undefined alg
      authorized = await JWT.verify(tok, secret, { alg: undefined })
    } catch (e) {
      err = e as JwtAlgorithmRequired
    }
    expect(err).toBeInstanceOf(JwtAlgorithmRequired)
    expect(authorized).toBeUndefined()
  })

  it('Should prevent algorithm confusion attack (RS256 token verified with HS256 using public key)', async () => {
    // Generate RSA key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    )

    const payload = { message: 'hello world' }

    // Sign token with RS256 using private key
    const tok = await JWT.sign(payload, keyPair.privateKey, AlgorithmTypes.RS256)

    // Verify should succeed with RS256 and public key
    const verified = await JWT.verify(tok, keyPair.publicKey, AlgorithmTypes.RS256)
    expect(verified).toEqual(payload)

    // Attempting to verify with HS256 using the public key should fail with algorithm mismatch
    // This simulates the algorithm confusion attack scenario
    let err: Error | undefined
    let maliciousResult
    try {
      maliciousResult = await JWT.verify(tok, keyPair.publicKey, AlgorithmTypes.HS256)
    } catch (e) {
      err = e as Error
    }
    // The verification should fail because the header.alg (RS256) doesn't match options.alg (HS256)
    expect(maliciousResult).toBeUndefined()
    expect(err).toBeInstanceOf(JwtAlgorithmMismatch)
  })

  it('Should throw JwtAlgorithmMismatch when header.alg does not match options.alg', async () => {
    const payload = { message: 'hello world' }
    const secret = 'a-secret'

    // Sign with HS512
    const tok = await JWT.sign(payload, secret, AlgorithmTypes.HS512)

    // Try to verify with HS256 (wrong algorithm)
    let err: Error | undefined
    let result
    try {
      result = await JWT.verify(tok, secret, AlgorithmTypes.HS256)
    } catch (e) {
      err = e as Error
    }

    expect(result).toBeUndefined()
    expect(err).toBeInstanceOf(JwtAlgorithmMismatch)
  })

  it('Should require explicit alg specification to prevent default fallback attack', async () => {
    const payload = { message: 'hello world' }
    const secret = 'a-secret'

    // Create a token with HS256
    const tok = await JWT.sign(payload, secret, AlgorithmTypes.HS256)

    // Verify with explicit HS256 should work
    const verified = await JWT.verify(tok, secret, AlgorithmTypes.HS256)
    expect(verified).toEqual(payload)

    // Verify without alg should throw error (no default fallback)
    let err: Error | undefined
    try {
      // @ts-expect-error - intentionally testing without alg parameter
      await JWT.verify(tok, secret)
    } catch (e) {
      err = e as Error
    }
    expect(err).toBeInstanceOf(JwtAlgorithmRequired)
  })
})

describe('JWT decode token format validation', () => {
  it('decode should throw JwtTokenInvalid for token with 2 parts', () => {
    const malformed = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8ifQ'
    expect(() => JWT.decode(malformed)).toThrow(JwtTokenInvalid)
  })

  it('decode should throw JwtTokenInvalid for token with 1 part', () => {
    expect(() => JWT.decode('eyJhbGciOiJIUzI1NiJ9')).toThrow(JwtTokenInvalid)
  })

  it('decode should throw JwtTokenInvalid for token with 4 parts', () => {
    const fourParts = 'a.b.c.d'
    expect(() => JWT.decode(fourParts)).toThrow(JwtTokenInvalid)
  })

  it('decode should throw JwtTokenInvalid for empty string', () => {
    expect(() => JWT.decode('')).toThrow(JwtTokenInvalid)
  })

  it('decodeHeader should throw JwtTokenInvalid for token with 2 parts', () => {
    const malformed = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXNzYWdlIjoiaGVsbG8ifQ'
    expect(() => JWT.decodeHeader(malformed)).toThrow(JwtTokenInvalid)
  })

  it('decodeHeader should throw JwtTokenInvalid for empty string', () => {
    expect(() => JWT.decodeHeader('')).toThrow(JwtTokenInvalid)
  })

  it('decode should work for valid 3-part token', async () => {
    const secret = 'a-secret'
    const tok = await JWT.sign({ message: 'hello' }, secret, AlgorithmTypes.HS256)
    const decoded = JWT.decode(tok)
    expect(decoded.header.alg).toBe('HS256')
    expect(decoded.payload).toEqual({ message: 'hello' })
  })

  it('decodeHeader should work for valid 3-part token', async () => {
    const secret = 'a-secret'
    const tok = await JWT.sign({ message: 'hello' }, secret, AlgorithmTypes.HS256)
    const header = JWT.decodeHeader(tok)
    expect(header.alg).toBe('HS256')
    expect(header.typ).toBe('JWT')
  })
})
