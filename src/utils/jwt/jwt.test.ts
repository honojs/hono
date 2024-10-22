/* eslint-disable @typescript-eslint/ban-ts-comment */
import { vi } from 'vitest'
import { encodeBase64 } from '../encode'
import { AlgorithmTypes } from './jwa'
import * as JWT from './jwt'
import {
  JwtAlgorithmNotImplemented,
  JwtTokenExpired,
  JwtTokenInvalid,
  JwtTokenIssuedAt,
  JwtTokenNotBefore,
  JwtTokenSignatureMismatched,
} from './types'

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

    const verifiedPayload = await JWT.verify(tok, secret)
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
      authorized = await JWT.verify(tok, invalidSecret)
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
