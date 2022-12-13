import type {
  VString,
  VNumber,
  VBoolean,
  VObject,
  VArray,
  VNumberArray,
  VStringArray,
  VBooleanArray,
  VBase,
} from './validator.ts'

export type Schema = {
  [key: string]: VString | VNumber | VBoolean | Schema | VObject<Schema> | VArray<Schema>
}

type Primitive<T> = T extends VNumberArray
  ? number[]
  : T extends VNumber
  ? number
  : T extends VStringArray
  ? string[]
  : T extends VString
  ? string
  : T extends VBooleanArray
  ? boolean[]
  : T extends VBoolean
  ? boolean
  : T

type P<T> = T extends VArray<infer R>
  ? P<R>[]
  : T extends VObject<infer R>
  ? P<R>
  : {
      [K in keyof T]: T[K] extends VBase
        ? Primitive<T[K]>
        : T[K] extends VArray<infer R>
        ? P<R>[]
        : T[K] extends VObject<infer R>
        ? P<R>
        : T[K] extends Schema
        ? P<T[K]>
        : never
    }

export type SchemaToProp<T> = P<T>
