/**
 * @module
 * Type definitions for JWT utilities.
 */

export class JwtAlgorithmNotImplemented extends Error {
  constructor(alg: string) {
    super(`${alg} is not an implemented algorithm`)
    this.name = 'JwtAlgorithmNotImplemented'
  }
}

export class JwtAlgorithmRequired extends Error {
  constructor() {
    super('JWT verification requires "alg" option to be specified')
    this.name = 'JwtAlgorithmRequired'
  }
}

export class JwtAlgorithmMismatch extends Error {
  constructor(expected: string, actual: string) {
    super(`JWT algorithm mismatch: expected "${expected}", got "${actual}"`)
    this.name = 'JwtAlgorithmMismatch'
  }
}

export class JwtTokenInvalid extends Error {
  constructor(token: string) {
    super(`invalid JWT token: ${token}`)
    this.name = 'JwtTokenInvalid'
  }
}

export class JwtTokenNotBefore extends Error {
  constructor(token: string) {
    super(`token (${token}) is being used before it's valid`)
    this.name = 'JwtTokenNotBefore'
  }
}

export class JwtTokenExpired extends Error {
  constructor(token: string) {
    super(`token (${token}) expired`)
    this.name = 'JwtTokenExpired'
  }
}

export class JwtTokenIssuedAt extends Error {
  constructor(currentTimestamp: number, iat: number) {
    super(
      `Invalid "iat" claim, must be a valid number lower than "${currentTimestamp}" (iat: "${iat}")`
    )
    this.name = 'JwtTokenIssuedAt'
  }
}

export class JwtTokenIssuer extends Error {
  constructor(expected: string | RegExp, iss: string | null) {
    super(`expected issuer "${expected}", got ${iss ? `"${iss}"` : 'none'}`)
    this.name = 'JwtTokenIssuer'
  }
}

export class JwtHeaderInvalid extends Error {
  constructor(header: object) {
    super(`jwt header is invalid: ${JSON.stringify(header)}`)
    this.name = 'JwtHeaderInvalid'
  }
}

export class JwtHeaderRequiresKid extends Error {
  constructor(header: object) {
    super(`required "kid" in jwt header: ${JSON.stringify(header)}`)
    this.name = 'JwtHeaderRequiresKid'
  }
}

export class JwtSymmetricAlgorithmNotAllowed extends Error {
  constructor(alg: string) {
    super(`symmetric algorithm "${alg}" is not allowed for JWK verification`)
    this.name = 'JwtSymmetricAlgorithmNotAllowed'
  }
}

export class JwtAlgorithmNotAllowed extends Error {
  constructor(alg: string, allowedAlgorithms: readonly string[]) {
    super(`algorithm "${alg}" is not in the allowed list: [${allowedAlgorithms.join(', ')}]`)
    this.name = 'JwtAlgorithmNotAllowed'
  }
}

export class JwtTokenSignatureMismatched extends Error {
  constructor(token: string) {
    super(`token (${token}) signature mismatched`)
    this.name = 'JwtTokenSignatureMismatched'
  }
}

export class JwtPayloadRequiresAud extends Error {
  constructor(payload: object) {
    super(`required "aud" in jwt payload: ${JSON.stringify(payload)}`)
    this.name = 'JwtPayloadRequiresAud'
  }
}

export class JwtTokenAudience extends Error {
  constructor(expected: string | string[] | RegExp, aud: string | string[]) {
    super(
      `expected audience "${
        Array.isArray(expected) ? expected.join(', ') : expected
      }", got "${aud}"`
    )
    this.name = 'JwtTokenAudience'
  }
}

export enum CryptoKeyUsage {
  Encrypt = 'encrypt',
  Decrypt = 'decrypt',
  Sign = 'sign',
  Verify = 'verify',
  DeriveKey = 'deriveKey',
  DeriveBits = 'deriveBits',
  WrapKey = 'wrapKey',
  UnwrapKey = 'unwrapKey',
}

/**
 * JWT Payload
 */
export type JWTPayload = {
  [key: string]: unknown
  /**
   * The token is checked to ensure it has not expired.
   */
  exp?: number
  /**
   * The token is checked to ensure it is not being used before a specified time.
   */
  nbf?: number
  /**
   * The token is checked to ensure it is not issued in the future.
   */
  iat?: number
  /**
   * The token is checked to ensure it has been issued by a trusted issuer.
   */
  iss?: string

  /**
   * The token is checked to ensure it is intended for a specific audience.
   */
  aud?: string | string[]
}

export type { HonoJsonWebKey } from './jws'
