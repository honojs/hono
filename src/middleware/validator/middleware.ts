import type { Context } from '../../context'
import type { Environment, MiddlewareHandler } from '../../hono'
import { getStatusText } from '../../utils/http-status'
import { mergeObjects } from '../../utils/object'
import type { Schema } from '../../validator/schema'
import type { ValidateResult } from '../../validator/validator'
import { Validator, VBase, VObjectBase } from '../../validator/validator'

type ResultSet = {
  hasError: boolean
  messages: string[]
  results: ValidateResult[]
}

type Done<P extends string, E extends Partial<Environment>, S extends Schema> = (
  resultSet: ResultSet,
  context: Context<P, E, S>
) => Response | void

type ValidationFunction<Path extends string, E extends Partial<Environment>, S extends Schema> = (
  v: Validator,
  c: Context<Path, E, S>
) => S

export const validatorMiddleware = <P extends string, S extends Schema, E extends Environment>(
  validationFunction: ValidationFunction<P, E, S>,
  options?: { done?: Done<P, E, S> }
) => {
  const v = new Validator()
  const handler: MiddlewareHandler<P, E, S> = async (c, next) => {
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

      // If it's invalid but it has no "value" messages, have to set the "type" messages.
      // This approach is verbose, but if do not so, the response body will be empty.
      if (!isValid && resultSet.messages.length === 0) {
        resultSet.results.map((r) => {
          if (!r.isValid && r.ruleType === 'type' && r.message) {
            resultSet.messages.push(r.message)
          }
        })
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
