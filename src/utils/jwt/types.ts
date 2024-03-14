export class JwtAlgorithmNotImplemented extends Error {
  constructor(alg: string) {
    super(`${alg} is not an implemented algorithm`)
    this.name = 'JwtAlgorithmNotImplemented'
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
    super(`Incorrect "iat" claim must be a older than "${currentTimestamp}" (iat: "${iat}")`)
    this.name = 'JwtTokenIssuedAt'
  }
}

export class JwtHeaderInvalid extends Error {
  constructor(header: object) {
    super(`jwt header is invalid: ${JSON.stringify(header)}`)
    this.name = 'JwtHeaderInvalid'
  }
}

export class JwtTokenSignatureMismatched extends Error {
  constructor(token: string) {
    super(`token(${token}) signature mismatched`)
    this.name = 'JwtTokenSignatureMismatched'
  }
}

export enum AlgorithmTypes {
  HS256 = 'HS256',
  HS384 = 'HS384',
  HS512 = 'HS512',
  RS256 = 'RS256',
  RS384 = 'RS384',
  RS512 = 'RS512',
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

export interface AlgorithmParams {
  name: string
  namedCurve?: string
  hash?: {
    name: string
  }
}

export type AlgorithmTypeName = keyof typeof AlgorithmTypes

export interface TokenHeader {
  alg: AlgorithmTypeName
  typ: 'JWT'
}

// eslint-disable-next-line
export function isTokenHeader(obj: any): obj is TokenHeader {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'alg' in obj &&
    Object.values(AlgorithmTypes).includes(obj.alg) &&
    'typ' in obj &&
    obj.typ === 'JWT'
  )
}
