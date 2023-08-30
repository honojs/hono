import { merge } from './parser/helper.ts'
import { parseKeys } from './parser/keys.ts'
import { parseValue } from './parser/value.ts'

type bodyParserOptions = {
  depth: number
  parseArrays: boolean
  arrayLimit: number
  allowPrototypes: boolean
  splitByComma: boolean
  parameterLimit: number
}

export class BodyParser {
  private static _options: bodyParserOptions = {
    depth: 5,
    parseArrays: true,
    arrayLimit: 20,
    allowPrototypes: false,
    splitByComma: true,
    parameterLimit: 1000,
  }

  public static setOptions(options: Partial<bodyParserOptions>) {
    this._options = {
      ...this._options,
      ...options,
    }
  }

  public static get options() {
    return this._options
  }

  public static parse<T>(value: unknown): T {
    if (value === '' || value === null || value === undefined) return {} as T

    const temp = typeof value === 'string' ? parseValue(value) : value

    let obj: Record<string, unknown> = {}

    const keys = Object.keys(temp)

    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i]
      const newObj = parseKeys(key, temp[key as keyof typeof temp], typeof value === 'string')

      obj = merge(obj, newObj as never) as typeof obj
    }

    return obj as T
  }
}
