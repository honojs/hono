/**
 * @module
 * Types utility.
 */

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

export type JSONPrimitive = string | boolean | number | null
export type JSONArray = (JSONPrimitive | JSONObject | JSONArray)[]
export type JSONObject = { [key: string]: JSONPrimitive | JSONArray | JSONObject | object }
export type InvalidJSONValue = undefined | symbol | ((...args: unknown[]) => unknown)

type InvalidToNull<T> = T extends InvalidJSONValue ? null : T

type IsInvalid<T> = T extends InvalidJSONValue ? true : false

/**
 * @typeParams T - union type
 * @example
 * IncludeInvalidButNotAll<number> returns `false`
 * IncludeInvalidButNotAll<undefined> returns `true`
 * IncludeInvalidButNotAll<number | undefined> returns `true` because some branches are invalid
 * IncludeInvalidButNotAll<symbol | undefined> returns `false` because all branches are invalid
 */
type IncludeInvalidButNotAll<T> = boolean extends IsInvalid<T> ? true : false

type Flatten<T> = { [K in keyof T]: T[K] }
/**
 * symbol keys are omitted through `JSON.stringify`
 */
type OmitSymbolKeys<T> = { [K in Exclude<keyof T, symbol>]: T[K] }
/**
 * if the value is an invalid value, its key is omitted
 */
type OmitInvalidValueKeys<T> = { [K in keyof T as T[K] extends InvalidJSONValue ? never : K]: T[K] }

export type JSONValue = JSONObject | JSONArray | JSONPrimitive
// Non-JSON values such as `Date` implement `.toJSON()`, so they can be transformed to a value assignable to `JSONObject`:
export type JSONParsed<T> = T extends { toJSON(): infer J }
  ? (() => J) extends () => JSONPrimitive
    ? J
    : (() => J) extends () => { toJSON(): unknown }
    ? {}
    : JSONParsed<J>
  : T extends JSONPrimitive
  ? T
  : T extends InvalidJSONValue
  ? never
  : T extends []
  ? []
  : T extends readonly [infer R, ...infer U]
  ? [JSONParsed<InvalidToNull<R>>, ...JSONParsed<U>]
  : T extends Array<infer U>
  ? Array<JSONParsed<InvalidToNull<U>>>
  : T extends Set<unknown> | Map<unknown, unknown>
  ? {}
  : T extends object
  ? Flatten<
      // if the value is T | undefined, its key is converted to optional
      Partial<{
        [K in keyof OmitSymbolKeys<T> as IncludeInvalidButNotAll<T[K]> extends true
          ? K
          : never]: JSONParsed<T[K]>
      }> & {
        [K in keyof OmitInvalidValueKeys<OmitSymbolKeys<T>> as IncludeInvalidButNotAll<
          T[K]
        > extends false
          ? K
          : never]: JSONParsed<T[K]>
      }
    >
  : never

/**
 * Useful to flatten the type output to improve type hints shown in editors. And also to transform an interface into a type to aide with assignability.
 * @copyright from sindresorhus/type-fest
 */
export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}

/**
 * A simple extension of Simplify that will deeply traverse array elements.
 */
export type SimplifyDeepArray<T> = T extends any[]
  ? { [E in keyof T]: SimplifyDeepArray<T[E]> }
  : Simplify<T>

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

export type IsAny<T> = boolean extends (T extends never ? true : false) ? true : false
