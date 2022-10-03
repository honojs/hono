import type { Context } from '../../context'
import type { Environment, Next, ValidatedData } from '../../hono'
import { getStatusText } from '../../utils/http-status'
import { VBase, Validator } from './validator'
import type {
  VString,
  VNumber,
  VBoolean,
  VObject,
  VNumberArray,
  VStringArray,
  VBooleanArray,
  ValidateResult,
} from './validator'

type Schema = {
  [key: string]:
    | VString
    | VNumber
    | VBoolean
    | VObject
    | VStringArray
    | VNumberArray
    | VBooleanArray
    | Schema
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
    : T[K] extends VObject
    ? object
    : T[K] extends Schema
    ? SchemaToProp<T[K]>
    : never
}

type ResultSet = {
  hasError: boolean
  messages: string[]
  results: ValidateResult[]
}

type Done<Env extends Partial<Environment>> = (
  resultSet: ResultSet,
  context: Context<string, Env>
) => Response | void

type ValidationFunction<T, Env extends Partial<Environment>> = (
  v: Validator,
  c: Context<string, Env>
) => T

type MiddlewareHandler<
  Data extends ValidatedData = ValidatedData,
  Env extends Partial<Environment> = Environment
> = (c: Context<string, Env, Data>, next: Next) => Promise<void> | Promise<Response | undefined>

export const validatorMiddleware = <T extends Schema, Env extends Partial<Environment>>(
  validationFunction: ValidationFunction<T, Env>,
  options?: { done?: Done<Env> }
) => {
  const v = new Validator()
  const handler: MiddlewareHandler<SchemaToProp<T>, Env> = async (c, next) => {
    const resultSet: ResultSet = {
      hasError: false,
      messages: [],
      results: [],
    }

    const validatorList = getValidatorList(validationFunction(v, c))

    for (const [keys, validator] of validatorList) {
      let result
      try {
        result = await validator.validate(c.req)
      } catch (e) {
        // Invalid JSON request
        return c.text(getStatusText(400), 400)
      }
      if (result.isValid) {
        // Set data on request object
        c.req.valid(keys, result.value)
      } else {
        resultSet.hasError = true
        if (result.message !== undefined) {
          resultSet.messages.push(result.message)
        }
      }
      resultSet.results.push(result)
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

function getValidatorList<T extends Schema>(schema: T): [string[], VBase][] {
  const map: [string[], VBase][] = []
  for (const [key, value] of Object.entries(schema)) {
    if (value instanceof VBase) {
      map.push([[key], value])
    } else {
      const children = getValidatorList(value)
      for (const [keys, validator] of children) {
        map.push([[key, ...keys], validator])
      }
    }
  }
  return map
}
