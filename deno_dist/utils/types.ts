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

export type RemoveBlankRecord<T> = T extends Record<infer K, unknown>
  ? K extends string
    ? T
    : never
  : never

export type JSONPrimitive = string | boolean | number | null | undefined
export type JSONArray = (JSONPrimitive | JSONObject | JSONArray)[]
export type JSONObject = { [key: string]: JSONPrimitive | JSONArray | JSONObject }
export type JSONValue = JSONObject | JSONArray | JSONPrimitive
