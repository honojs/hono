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

export type IfAnyThenEmptyObject<T> = 0 extends 1 & T ? {} : T

export type IntersectNonAnyTypes<T extends any[]> = T extends [infer Head, ...infer Rest]
  ? IfAnyThenEmptyObject<Head> & IntersectNonAnyTypes<Rest>
  : {}

export type JSONPrimitive = string | boolean | number | null | undefined
export type JSONArray = (JSONPrimitive | JSONObject | JSONArray)[]
export type JSONObject = { [key: string]: JSONPrimitive | JSONArray | JSONObject }
export type JSONValue = JSONObject | JSONArray | JSONPrimitive

export type InterfaceToType<T> = T extends Function ? T : { [K in keyof T]: InterfaceToType<T[K]> }

export type RequiredKeysOf<BaseType extends object> = Exclude<
  {
    [Key in keyof BaseType]: BaseType extends Record<Key, BaseType[Key]> ? Key : never
  }[keyof BaseType],
  undefined
>

export type HasRequiredKeys<BaseType extends object> = RequiredKeysOf<BaseType> extends never
  ? false
  : true
