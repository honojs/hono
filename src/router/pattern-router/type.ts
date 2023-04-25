/* 
 Based on `@cloudflare/workers-types` <https://github.com/cloudflare/workerd>
 License: MIT OR Apache-2.0
 Author: Cloudflare Workers DevProd Team <workers-devprod@cloudflare.com> (https://workers.cloudflare.com)
*/

export declare class URLPattern {
  constructor(input?: string | URLPatternURLPatternInit, baseURL?: string)
  get protocol(): string
  get username(): string
  get password(): string
  get hostname(): string
  get port(): string
  get pathname(): string
  get search(): string
  get hash(): string
  test(input?: string | URLPatternURLPatternInit, baseURL?: string): boolean
  exec(
    input?: string | URLPatternURLPatternInit,
    baseURL?: string
  ): URLPatternURLPatternResult | null
}

interface URLPatternURLPatternInit {
  protocol?: string
  username?: string
  password?: string
  hostname?: string
  port?: string
  pathname?: string
  search?: string
  hash?: string
  baseURL?: string
}

interface URLPatternURLPatternComponentResult {
  input: string
  groups: Record<string, string>
}

interface URLPatternURLPatternResult {
  inputs: (string | URLPatternURLPatternInit)[]
  protocol: URLPatternURLPatternComponentResult
  username: URLPatternURLPatternComponentResult
  password: URLPatternURLPatternComponentResult
  hostname: URLPatternURLPatternComponentResult
  port: URLPatternURLPatternComponentResult
  pathname: URLPatternURLPatternComponentResult
  search: URLPatternURLPatternComponentResult
  hash: URLPatternURLPatternComponentResult
}
