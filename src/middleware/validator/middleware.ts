import type { Context } from '../../context'
import type { Environment, MiddlewareHandler, ValidatedData } from '../../hono'
import { getStatusText } from '../../utils/http-status'
import { mergeObjects } from '../../utils/object'
import { VBase, Validator, VObjectBase } from './validator'
import type {
  VString,
  VNumber,
  VBoolean,
  VObject,
  VNumberArray,
  VStringArray,
  VBooleanArray,
  ValidateResult,
  VArray,
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

type SchemaToProp<T> = {
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

type ResultSet = {
  hasError: boolean
  messages: string[]
  results: ValidateResult[]
}

type Done<P extends string, E extends Partial<Environment>, D extends ValidatedData> = (
  resultSet: ResultSet,
  context: Context<P, E, D>
) => Response | void

type ValidationFunction<P extends string, Env extends Partial<Environment>, T> = (
  v: Validator,
  c: Context<P, Env>
) => T

/*
type MiddlewareHandler<
  Data extends ValidatedData = ValidatedData,
  Env extends Partial<Environment> = Environment
> = (c: Context<string, Env, Data>, next: Next) => Promise<void> | Promise<Response | undefined>
*/
export const validatorMiddleware = <
  P extends string,
  T extends Schema,
  Env extends Partial<Environment>
>(
  validationFunction: ValidationFunction<P, Env, T>,
  options?: { done?: Done<P, Env, SchemaToProp<T>> }
) => {
  const v = new Validator()
  const handler: MiddlewareHandler<P, Env, SchemaToProp<T>> = async (c, next) => {
    const resultSet: ResultSet = {
      hasError: false,
      messages: [],
      results: [],
    }

    const schema = validationFunction(v, c)
    const validatorList = getValidatorList(schema)
    let data: any = {}

    for (const [keys, validator] of validatorList) {
      let results: ValidateResult[]
      try {
        results = await validator.validate(c.req as Request)
      } catch (e) {
        // Invalid JSON request
        return c.text(getStatusText(400), 400)
      }

      let isValid = true
      const value = results[0].value
      const jsonData = results[0].jsonData

      for (const result of results) {
        if (!result.isValid) {
          isValid = false
          resultSet.hasError = true
          if (result.ruleType === 'value' && result.message !== undefined) {
            resultSet.messages.push(result.message)
          }
        }
        resultSet.results.push(result)
      }

      // Set data on request object
      if (isValid) {
        // Set data on request object
        if (jsonData) {
          const dst = data
          data = mergeObjects(dst, jsonData)
        } else {
          c.req.valid(keys, value)
        }
      }
    }

    if (!resultSet.hasError) {
      Object.keys(data).map((key) => {
        c.req.valid(key, data[key])
      })
    }

    if (options && options.done) {
      const res = options.done(resultSet, c)
      if (res) {
        return res
      }
    }

    if (resultSet.hasError) {
      return c.text(resultSet.messages.join('\n'), 400)
    }
    await next()
  }
  return handler
}

function getValidatorList<T extends Schema>(schema: T) {
  const map: [string[], VBase][] = []
  for (const [key, value] of Object.entries(schema)) {
    if (value instanceof VObjectBase) {
      const validators = value.getValidators()
      for (const validator of validators) {
        map.push([value.keys, validator])
      }
    } else if (value instanceof VBase) {
      map.push([[key], value])
    } else {
      const children = getValidatorList(value as Schema)
      for (const [keys, validator] of children) {
        map.push([[key, ...keys], validator])
      }
    }
  }
  return map
}
