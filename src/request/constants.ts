/**
 * @module
 * Internal constants used by the request module.
 */

/**
 * Symbol used as a key to store and retrieve the route match result
 * on a HonoRequest instance. This avoids string key collisions and
 * keeps the match result as an internal implementation detail.
 */
export const GET_MATCH_RESULT: unique symbol = Symbol()
