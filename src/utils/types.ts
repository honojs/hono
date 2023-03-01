/* eslint-disable @typescript-eslint/no-explicit-any */
export type Expect<T extends true> = T
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false
export type NotEqual<X, Y> = true extends Equal<X, Y> ? false : true

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

export type JSONPrimitive = string | boolean | number | null | undefined
export type JSONArray = (JSONPrimitive | JSONObject | JSONArray)[]
export type JSONObject = { [key: string]: JSONPrimitive | JSONArray | JSONObject }
export type JSONValue = JSONObject | JSONArray | JSONPrimitive

// `boolean` will be `true` or `false` because it's an alias of them.
// See: https://github.com/microsoft/TypeScript/issues/22596
// This type converts `true | false` to `boolean` that we expect.
type TrueAndFalseToBoolean<T> = T extends true ? boolean : T extends false ? boolean : T

export type PrettyJSON<T> = T extends JSONPrimitive
  ? TrueAndFalseToBoolean<T>
  : T extends JSONArray
  ? PrettyJSON<T[number]>
  : T extends JSONObject
  ? { [K in keyof T]: PrettyJSON<T[K]> }
  : never
