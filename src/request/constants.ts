export const GET_MATCH_RESULT: unique symbol = Symbol()

/**
 * Symbol used to identify a `HonoRequest` instance (as opposed to a raw
 * `Request`) without importing the `HonoRequest` class itself.
 *
 * `../request.ts` imports `../utils/body.ts` (for `parseBody`) at runtime, so
 * `utils/body.ts` importing `HonoRequest` back from `../request.ts` for an
 * `instanceof` check would create a circular import between the two modules.
 * Depending on this marker (declared in this dependency-free module) instead
 * lets `utils/body.ts` duck-type a `HonoRequest` while only needing a
 * type-only import of the `HonoRequest` class, which breaks the runtime
 * cycle. See https://github.com/honojs/hono/issues/5068.
 */
export const HONO_REQUEST: unique symbol = Symbol()
