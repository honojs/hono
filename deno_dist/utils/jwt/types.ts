export class JwtAlgorithmNotImplemented extends Error {
  constructor(token: string) {
    super(`invalid JWT token: ${token}`)
    this.name = 'JwtAlgorithmNotImplemented'
  }
}

/**
 * Export for backward compatibility
 * @deprecated Use JwtAlgorithmNotImplemented instead
**/
export const JwtAlorithmNotImplemented = JwtAlgorithmNotImplemented

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

