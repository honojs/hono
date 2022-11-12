import { JSONPathCopy } from './../utils/json.ts'
import type { JSONObject, JSONPrimitive, JSONArray } from './../utils/json.ts'
import { rule } from './rule.ts'
import { sanitizer } from './sanitizer.ts'
import type { Schema } from './schema.ts'

type Target = 'query' | 'queries' | 'header' | 'body' | 'json'
type Type = JSONPrimitive | JSONObject | JSONArray | File
type RuleFunc = (value: Type) => boolean
type Rule = {
  name: string
  func: RuleFunc
  customMessage?: string
  type: 'type' | 'value'
}
type Sanitizer = (value: Type) => Type

export type ValidateResult = {
  isValid: boolean
  message: string | undefined
  target: Target | 'unknown'
  key: string | null
  value: Type | null
  ruleName: string
  ruleType: 'type' | 'value'
  jsonData?: JSONObject
}

export abstract class VObjectBase<T extends Schema> {
  container: T
  keys: string[] = []
  protected _isOptional: boolean = false
  constructor(container: T, key: string) {
    this.container = container
    if (this instanceof VArray) {
      this.keys.push(key, '[*]')
    } else if (this instanceof VObject) {
      this.keys.push(key)
    }
  }

  isOptional() {
    this._isOptional = true
    return this
  }

  getValidators = (): VBase[] => {
    const validators: VBase[] = []
    const thisKeys: string[] = []
    Object.assign(thisKeys, this.keys)

    const walk = (container: T, keys: string[], isOptional: boolean) => {
      for (const v of Object.values(container)) {
        if (v instanceof VArray || v instanceof VObject) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          isOptional ||= v._isOptional
          keys.push(...v.keys)
          walk(v.container as T, keys, isOptional)
          const tmp: string[] = []
          Object.assign(tmp, thisKeys)
          keys = tmp
        } else if (v instanceof VBase) {
          if (isOptional) v.isOptional()
          v.baseKeys.push(...keys)
          validators.push(v)
        }
      }
    }

    walk(this.container, this.keys, this._isOptional)

    return validators
  }
}

export class VObject<T extends Schema> extends VObjectBase<T> {
  constructor(container: T, key: string) {
    super(container, key)
  }
}

export class VArray<T extends Schema> extends VObjectBase<T> {
  type: 'array' = 'array'
  constructor(container: T, key: string) {
    super(container, key)
  }
}

export class Validator {
  isArray: boolean = false
  query = (key: string): VString => new VString({ target: 'query', key: key })
  queries = (key: string): VStringArray => new VStringArray({ target: 'queries', key: key })
  header = (key: string): VString => new VString({ target: 'header', key: key })
  body = (key: string): VString => new VString({ target: 'body', key: key })
  json = (key: string) => {
    if (this.isArray) {
      return new VStringArray({ target: 'json', key: key })
    } else {
      return new VString({ target: 'json', key: key })
    }
  }
  array = <T extends Schema>(path: string, validator: (v: Validator) => T): VArray<T> => {
    this.isArray = true
    const res = validator(this)
    const arr = new VArray(res, path)
    return arr
  }
  object = <T extends Schema>(path: string, validator: (v: Validator) => T): VObject<T> => {
    this.isArray = false
    const res = validator(this)
    const obj = new VObject(res, path)
    return obj
  }
}

type VOptions = {
  target: Target
  key: string
  type?: 'string' | 'number' | 'boolean' | 'object'
  isArray?: boolean
}

export abstract class VBase {
  type: 'string' | 'number' | 'boolean' | 'object'
  target: Target
  baseKeys: string[] = []
  key: string
  rules: Rule[]
  sanitizers: Sanitizer[]
  isArray: boolean
  private _optional: boolean
  constructor(options: VOptions) {
    this.target = options.target
    this.key = options.key
    this.type = options.type || 'string'
    this.rules = [
      {
        name: this.getTypeRuleName(),
        type: 'type',
        func: this.validateType,
      },
    ]
    this.sanitizers = []
    this._optional = false
    this.isArray = options.isArray || false
  }

  private _nested = () => (this.baseKeys.length ? true : false)

  addRule(func: RuleFunc): this
  addRule(name: string, func: RuleFunc): this
  addRule(arg: string | RuleFunc, func?: RuleFunc) {
    if (typeof arg === 'string' && func) {
      this.rules.push({ name: arg, func, type: 'value' })
    } else if (arg instanceof Function) {
      this.rules.push({ name: arg.name, func: arg, type: 'value' })
    }
    return this
  }

  addSanitizer = (sanitizer: Sanitizer) => {
    this.sanitizers.push(sanitizer)
    return this
  }

  message = (text: string) => {
    const len = this.rules.length
    if (len >= 1) {
      this.rules[len - 1].customMessage = text
    }
    return this
  }

  isRequired = () => {
    return this.addRule('isRequired', (value: unknown) => {
      if (value !== undefined && value !== null && value !== '') return true
      return false
    })
  }

  isOptional = () => {
    this._optional = true
    return this.addRule('isOptional', () => true)
  }

  isEqual = (comparison: unknown) => {
    return this.addRule('isEqual', (value: unknown) => {
      return value === comparison
    })
  }

  asNumber = (): VNumber | VNumberArray => {
    const newVNumber = new VNumber({ ...this, type: 'number' })
    if (this.isArray) return newVNumber.asArray()
    return newVNumber
  }

  asBoolean = (): VBoolean | VBooleanArray => {
    const newVBoolean = new VBoolean({ ...this, type: 'boolean' })
    if (this.isArray) return newVBoolean.asArray()
    return newVBoolean
  }

  get(value: string) {
    const len = this.rules.length
    if (len > 0) {
      this.rules[this.rules.length - 1].customMessage = value
    }
    return this
  }

  validate = async <R extends Request>(req: R): Promise<ValidateResult[]> => {
    let value: Type = undefined
    let jsonData: JSONObject | undefined = undefined

    if (this.target === 'query') {
      value = req.query(this.key)
    }
    if (this.target === 'queries') {
      value = req.queries(this.key)
    }
    if (this.target === 'header') {
      value = req.header(this.key)
    }
    if (this.target === 'body') {
      const body = await req.parseBody()
      value = body[this.key]
    }
    if (this.target === 'json') {
      if (this._nested()) {
        this.key = `${this.baseKeys.join('.')}.${this.key}`
      }
      let obj = {}
      try {
        obj = (await req.json()) as JSONObject
      } catch (e) {
        throw new Error('Malformed JSON in request body')
      }
      const dst = {}
      value = JSONPathCopy(obj, dst, this.key)
      if (this._nested()) jsonData = dst
    }

    value = this.sanitizeValue(value)

    const results: ValidateResult[] = []

    let typeRule = this.rules.shift()

    for (const rule of this.rules) {
      if (rule.type === 'type') {
        typeRule = rule
      } else if (rule.type === 'value') {
        const result = this.validateRule(rule, value)
        result.jsonData ||= jsonData
        results.push(result)
      }
    }

    if (typeRule) {
      const typeResult = this.validateRule(typeRule, value)
      typeResult.jsonData ||= jsonData
      results.unshift(typeResult)
      this.rules.unshift(typeRule)
    }

    return results
  }

  protected getTypeRuleName(): string {
    const prefix = 'should be'
    return this.isArray ? `${prefix} "${this.type}[]"` : `${prefix} "${this.type}"`
  }

  private sanitizeValue = (value: Type) => (
    this.sanitizers.reduce(
      (acc, sanitizer) => sanitizer(acc),
      value
    )
  )

  private validateRule(rule: Rule, value: Type): ValidateResult {
    let isValid: boolean = false

    if (this._nested() && this.target != 'json') {
      isValid = false
    } else if (rule.type === 'value') {
      isValid = this.validateValue(rule.func, value)
    } else if (rule.type === 'type') {
      isValid = this.validateType(value)
    }

    const message = isValid
      ? undefined
      : rule.customMessage || this.getMessage({ ruleName: rule.name, value })
    const result = {
      isValid: isValid,
      message: message,
      target: this.target,
      key: this.key,
      value,
      ruleName: rule.name,
      ruleType: rule.type,
    }
    return result
  }

  private validateType = (value: Type): boolean => {
    if (this.isArray) {
      if (!Array.isArray(value)) {
        return false
      }
      for (const val of value) {
        if (typeof val === 'undefined' && this._nested()) {
          value.pop()
        }
        for (const val of value) {
          if (typeof val !== this.type) {
            // Value is of wrong type here
            // If it is not optional and not undefined, return false
            if (!this._optional || typeof val !== 'undefined') return false
          }
        }
      }
    } else {
      if (typeof value !== this.type) {
        if (this._optional && (typeof value === 'undefined' || Array.isArray(value))) {
          // Do nothing.
          // If it is optional it's OK to be `undefined` or Array
        } else {
          return false
        }
      }
    }
    return true
  }

  private validateValue = (func: (value: Type) => boolean, value: Type): boolean => {
    if (this._optional && typeof value === 'undefined') return true

    if (Array.isArray(value)) {
      if (value.length === 0 && !this._optional) return false
      for (const val of value) {
        if (!func(val)) {
          return false
        }
      }
      return true
    } else {
      if (!func(value)) {
        return false
      }
      return true
    }
  }

  private getMessage = (opts: { ruleName: string; value: Type }): string => {
    let keyText: string
    const valueText = Array.isArray(opts.value)
      ? `${opts.value
          .map((val) =>
            val === undefined ? 'undefined' : typeof val === 'string' ? `"${val}"` : val
          )
          .join(', ')}`
      : opts.value
    switch (this.target) {
      case 'query':
        keyText = `the query parameter "${this.key}"`
        break
      case 'queries':
        keyText = `the query parameters "${this.key}"`
        break
      case 'header':
        keyText = `the request header "${this.key}"`
        break
      case 'body':
        keyText = `the request body "${this.key}"`
        break
      case 'json':
        keyText = `the JSON body "${this.key}"`
        break
    }
    return `Invalid Value [${valueText}]: ${keyText} is invalid - ${opts.ruleName}`
  }
}

export class VString extends VBase {
  constructor(options: VOptions) {
    super(options)
    this.type = 'string'
  }

  asArray = () => {
    return new VStringArray(this)
  }

  isEmpty = (
    options: {
      ignore_whitespace: boolean
    } = { ignore_whitespace: false }
  ) => {
    return this.addRule('isEmpty', (value) => rule.isEmpty(value as string, options))
  }

  isLength = (options: Partial<{ min: number; max: number }> | number, arg2?: number) => {
    return this.addRule('isLength', (value) => rule.isLength(value as string, options, arg2))
  }

  isAlpha = () => {
    return this.addRule('isAlpha', (value) => rule.isAlpha(value as string))
  }

  isNumeric = () => {
    return this.addRule('isNumeric', (value) => rule.isNumeric(value as string))
  }

  contains = (
    elem: string,
    options: Partial<{ ignoreCase: boolean; minOccurrences: number }> = {
      ignoreCase: false,
      minOccurrences: 1,
    }
  ) => {
    return this.addRule('contains', (value) => rule.contains(value as string, elem, options))
  }

  isIn = (options: string[]) => {
    return this.addRule('isIn', (value) => rule.isIn(value as string, options))
  }

  match = (regExp: RegExp) => {
    return this.addRule('match', (value) => rule.match(value as string, regExp))
  }

  trim = () => {
    return this.addSanitizer((value) => sanitizer.trim(value as string))
  }
}

export class VNumber extends VBase {
  constructor(options: VOptions) {
    super(options)
    this.type = 'number'
  }

  asArray = () => {
    return new VNumberArray(this)
  }

  isGte = (min: number) => {
    return this.addRule('isGte', (value) => rule.isGte(value as number, min))
  }

  isLte = (min: number) => {
    return this.addRule('isLte', (value) => rule.isLte(value as number, min))
  }
}

export class VBoolean extends VBase {
  constructor(options: VOptions) {
    super(options)
    this.type = 'boolean'
  }

  asArray = () => {
    return new VBooleanArray(this)
  }

  isTrue = () => {
    return this.addRule('isTrue', (value) => rule.isTrue(value as boolean))
  }

  isFalse = () => {
    return this.addRule('isFalse', (value) => rule.isFalse(value as boolean))
  }
}

export class VNumberArray extends VNumber {
  isArray: true
  constructor(options: VOptions) {
    super(options)
    this.isArray = true
    this.rules[0].name = this.getTypeRuleName()
  }
}
export class VStringArray extends VString {
  isArray: true
  constructor(options: VOptions) {
    super(options)
    this.isArray = true
    this.rules[0].name = this.getTypeRuleName()
  }
}
export class VBooleanArray extends VBoolean {
  isArray: true
  constructor(options: VOptions) {
    super(options)
    this.isArray = true
    this.rules[0].name = this.getTypeRuleName()
  }
}
