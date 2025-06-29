/* eslint-disable @typescript-eslint/ban-ts-comment */
import { vi } from 'vitest'
import { encodeBase64, encodeBase64Url } from '../encode'
import { AlgorithmTypes } from './jwa'
import { signing } from './jws'
import * as JWT from './jwt'
import { verifyFromJwks } from './jwt'
import {
  JwtAlgorithmNotImplemented,
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
      authorized = await JWT.verify(tok, secret, AlgorithmTypes.HS256, 'some')
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
      authorized = await JWT.verify(tok, secret, AlgorithmTypes.HS256, 'expected-issuer')
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
      authorized = await JWT.verify(tok, secret, AlgorithmTypes.HS256, /^(hello|hi)$/)
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
      authorized = await JWT.verify(tok, secret, AlgorithmTypes.HS256, 'correct-issuer')
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
      authorized = await JWT.verify(tok, secret, AlgorithmTypes.HS256, /^(hello|hi)$/)
    } catch (e) {
      err = e
    }
    expect(err).toBeUndefined()
    expect(authorized?.iss).toEqual('hello')
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

describe('verifyFromJwks header.alg fallback', () => {
  it('Should use header.alg as fallback when matchingKey.alg is missing', async () => {
    // Setup: Create a JWT signed with HS384 (different from default HS256)
    const payload = { message: 'hello world' }
    const headerAlg = 'HS384' // Non-default value
    const secret = 'secret'
    const kid = 'dummy'

    // Create JWT (signed with HS384)
    const header = { alg: headerAlg, typ: 'JWT', kid }
    const encode = (obj: object) => encodeBase64Url(utf8Encoder.encode(JSON.stringify(obj)).buffer)
    const encodedHeader = encode(header)
    const encodedPayload = encode(payload)
    const signingInput = `${encodedHeader}.${encodedPayload}`

    // Use signing function from jws.ts instead of createHmac directly
    const signatureBuffer = await signing(secret, headerAlg, utf8Encoder.encode(signingInput))
    const signature = encodeBase64Url(signatureBuffer)

    const token = `${encodedHeader}.${encodedPayload}.${signature}`

    // Create a key without alg property
    const keys = [
      {
        kty: 'oct',
        kid,
        k: encodeBase64Url(utf8Encoder.encode(secret).buffer),
        use: 'sig',
        // alg is intentionally omitted
      },
    ]

    // Execute: Verify the JWT token signed with HS384
    const result = await verifyFromJwks(token, { keys })

    // If verification succeeds, it means header.alg was used
    expect(result).toEqual(payload)
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
