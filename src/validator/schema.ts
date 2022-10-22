import type {
  VString,
  VNumber,
  VBoolean,
  VObject,
  VNumberArray,
  VStringArray,
  VBooleanArray,
  VArray,
  VObjectBase,
} from './validator'

export type Schema = {
  [key: string]:
    | VString
    | VNumber
    | VBoolean
    | VStringArray
    | VNumberArray
    | VBooleanArray
    | Schema
    | VObject<Schema>
    | VArray<Schema>
}

export type SchemaToProp<T> = {
  [K in keyof T]: T[K] extends VNumberArray
    ? number[]
    : T[K] extends VBooleanArray
    ? boolean[]
    : T[K] extends VStringArray
    ? string[]
    : T[K] extends VNumber
    ? number
    : T[K] extends VBoolean
    ? boolean
    : T[K] extends VString
    ? string
    : T[K] extends VObjectBase<Schema>
    ? T[K]['container'] extends VNumber
      ? number
      : T[K]['container'] extends VString
      ? string
      : T[K]['container'] extends VBoolean
      ? boolean
      : T[K] extends VArray<Schema>
      ? SchemaToProp<ReadonlyArray<T[K]['container']>>
      : T[K] extends VObject<Schema>
      ? SchemaToProp<T[K]['container']>
      : T[K] extends Schema
      ? SchemaToProp<T[K]>
      : never
    : SchemaToProp<T[K]>
}
