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
}

/**
 * JWT Payload
 */
export type JWTPayload =
  | (unknown & {})
  | {
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
    }
