import type { Context } from '../context'
import { HTTPException } from '../http-exception'
import type { Env, FormValue, Handler, TypedResponse, ValidationTargets } from '../types'
import type { ContentfulStatusCode } from '../utils/http-status'
import type { JSONParsed } from '../utils/types'
import type { InferInput } from './utils'
import { getValidationTarget } from './validator'

type StandardSchemaIssue = {
  readonly message: string
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined
}

type StandardSchemaResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<StandardSchemaIssue> }

/**
 * The part of the Standard Schema interface used by `validatedHandler()`.
 * @see {@link https://standardschema.dev/}
 */
export type StandardSchema<Input = unknown, Output = Input> = {
  readonly '~standard': {
    readonly validate: (
      value: unknown
    ) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>
    readonly types?: { readonly input: Input; readonly output: Output } | undefined
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyStandardSchema = StandardSchema<any, any>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResponse = Response | TypedResponse<any, any, any>

/**
 * A Standard Schema or a validation function for `Value`.
 * `T` is the schema itself, or the output of the function. It is `never` when not specified.
 */
type Validation<Value, T> =
  | (T & AnyStandardSchema)
  // A callable schema (e.g. ArkType) is typed by this branch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | ((value: Value, c: Context<any, any, any>) => T | Promise<T>)

type ResponseValidation<In, Out> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | (Out & StandardSchema<In, any>)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | ((value: In, c: Context<any, any, any>) => Out | Promise<Out>)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InputOf<T> = T extends StandardSchema<infer I, any> ? I : Exclude<T, AnyResponse>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OutputOf<T> = T extends StandardSchema<any, infer O> ? O : Exclude<T, AnyResponse>

type RequestTarget = keyof ValidationTargets

type Targets = { [K in RequestTarget]: unknown }

type ValidatedTarget<T extends Targets> = {
  [K in RequestTarget]: [T[K]] extends [never] ? never : K
}[RequestTarget]

type ValidatedInput<T extends Targets> = {
  in: {
    [K in ValidatedTarget<T>]: K extends 'json'
      ? InputOf<T[K]>
      : InferInput<InputOf<T[K]>, K, FormValue>
  }
  out: { [K in ValidatedTarget<T>]: OutputOf<T[K]> }
}

/**
 * An issue in the default failure response. The input value is not included.
 */
export type ValidationIssue = { message: string; path?: PropertyKey[] }

type SchemaFailureResponse<Target extends string, S extends ContentfulStatusCode> = Response &
  TypedResponse<
    Target extends 'response'
      ? { success: false; target: Target }
      : { success: false; target: Target; error: ValidationIssue[] },
    S,
    'json'
  >

type FailureResponseOf<T, Target extends string, S extends ContentfulStatusCode> = [T] extends [
  never,
]
  ? never
  : T extends AnyStandardSchema
    ? SchemaFailureResponse<Target, S>
    : Extract<T, AnyResponse>

type RequestFailureResponse<T extends Targets> = {
  [K in RequestTarget]: FailureResponseOf<T[K], K, 400>
}[RequestTarget]

type JSONResponseOf<T> = Response & TypedResponse<JSONParsed<T>, ContentfulStatusCode, 'json'>

type RequestOptions<Param, Query, Header, Cookie, Form, Json> = {
  param?: Validation<ValidationTargets['param'], Param>
  query?: Validation<ValidationTargets['query'], Query>
  header?: Validation<ValidationTargets['header'], Header>
  cookie?: Validation<ValidationTargets['cookie'], Cookie>
  form?: Validation<ValidationTargets['form'], Form>
  json?: Validation<ValidationTargets['json'], Json>
}

interface ValidatedHandler<E extends Env, P extends string> {
  // Without `response`
  <
    Param = never,
    Query = never,
    Header = never,
    Cookie = never,
    Form = never,
    Json = never,
    T extends Targets = {
      param: Param
      query: Query
      header: Header
      cookie: Cookie
      form: Form
      json: Json
    },
  >(
    options: RequestOptions<Param, Query, Header, Cookie, Form, Json> & {
      response?: undefined
      handle: (c: Context<E, P, ValidatedInput<T>>) => unknown
    }
  ): Handler<E, P, ValidatedInput<T>, Promise<Response | RequestFailureResponse<T>>>
  // With `response`
  <
    ResponseIn,
    ResponseOut,
    Param = never,
    Query = never,
    Header = never,
    Cookie = never,
    Form = never,
    Json = never,
    T extends Targets = {
      param: Param
      query: Query
      header: Header
      cookie: Cookie
      form: Form
      json: Json
    },
  >(
    options: RequestOptions<Param, Query, Header, Cookie, Form, Json> & {
      response: ResponseValidation<ResponseIn, ResponseOut>
      handle: (
        c: Context<E, P, ValidatedInput<T>>
      ) => NoInfer<ResponseIn | Response | Promise<ResponseIn | Response>>
    }
  ): Handler<
    E,
    P,
    ValidatedInput<T>,
    Promise<
      | JSONResponseOf<OutputOf<ResponseOut>>
      | FailureResponseOf<ResponseOut, 'response', 500>
      | RequestFailureResponse<T>
    >
  >
}

const requestTargets: RequestTarget[] = ['param', 'query', 'header', 'cookie', 'form', 'json']

const isStandardSchema = (v: unknown): v is AnyStandardSchema =>
  (typeof v === 'object' || typeof v === 'function') && v !== null && '~standard' in v

const toValidationFunction = (
  v: Validation<unknown, unknown>,
  target: RequestTarget | 'response'
): ((value: unknown, c: Context) => unknown) => {
  if (!isStandardSchema(v)) {
    return v
  }
  const validate = v['~standard'].validate
  const status = target === 'response' ? 500 : 400
  const fail = (c: Context, issues: ReadonlyArray<StandardSchemaIssue>) => {
    const body =
      target === 'response'
        ? { success: false, target }
        : { success: false, target, error: toValidationIssues(issues) }
    throw new HTTPException(status, {
      res: c.json(body, status),
      cause: { target, issues },
    })
  }
  return (value, c) => {
    const result = validate(value)
    if (result instanceof Promise) {
      return result.then((r) => (r.issues ? fail(c, r.issues) : r.value))
    }
    return result.issues ? fail(c, result.issues) : result.value
  }
}

const toValidationIssues = (issues: ReadonlyArray<StandardSchemaIssue>): ValidationIssue[] =>
  issues.map(({ message, path }) =>
    path ? { message, path: path.map((p) => (typeof p === 'object' ? p.key : p)) } : { message }
  )

/**
 * `validatedHandler()` defines a handler with request and response validation.
 *
 * Each request target (`param`, `query`, `json`, `form`, `header`, `cookie`) is validated with
 * `validator()` before `handle` runs, so the values are available through `c.req.valid()`.
 * A value returned from `handle` is validated with `response` and returned as JSON.
 * A `Response` returned from `handle` is returned as is.
 *
 * Each validation accepts a Standard Schema or a validation function.
 * When a Standard Schema fails, an `HTTPException` is thrown with status 400 for the request
 * and 500 for the response, so `onError` can handle it. Its `res` is a `{ success: false, target }`
 * JSON response (with `error: issues` for the request), and its `cause` is `{ target, issues }`.
 *
 * @experimental
 * `validatedHandler()` is an experimental feature.
 * The API might be changed.
 *
 * @example
 * ```ts
 * const handler = validatedHandler({
 *   param: ParamSchema,
 *   json: BodySchema,
 *   response: UserSchema,
 *   handle: async (c) => {
 *     const { id } = c.req.valid('param')
 *     const body = c.req.valid('json')
 *     c.status(201)
 *     return { id, ...body }
 *   },
 * })
 *
 * app.post('/users/:id', handler)
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyValidatedHandler = ValidatedHandler<any, any>

type ValidatedHandlerFactory = AnyValidatedHandler & {
  // `validatedHandler<Env, Path>()` returns the typed version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <E extends Env, P extends string = any>(): ValidatedHandler<E, P>
}

export const validatedHandler: ValidatedHandlerFactory = ((
  options?: {
    [K in RequestTarget]?: Validation<unknown, unknown>
  } & {
    response?: Validation<unknown, unknown>
    handle: (c: Context) => unknown
  }
): Handler | ValidatedHandlerFactory => {
  if (!options) {
    return validatedHandler
  }
  const validators = requestTargets
    .filter((target) => options[target])
    .map((target) => [target, toValidationFunction(options[target]!, target)] as const)
  const validateResponse = options.response && toValidationFunction(options.response, 'response')

  const handler = async (c: Context) => {
    for (const [target, validate] of validators) {
      let value = getValidationTarget(c, target)
      if (value instanceof Promise) {
        value = await value
      }
      let res = validate(value, c)
      if (res instanceof Promise) {
        res = await res
      }
      if (res instanceof Response) {
        return res
      }
      c.req.addValidatedData(target, res as never)
    }

    let result = options.handle(c)
    if (result instanceof Promise) {
      result = await result
    }
    if (result instanceof Response) {
      return result
    }
    if (validateResponse) {
      result = validateResponse(result, c)
      if (result instanceof Promise) {
        result = await result
      }
      if (result instanceof Response) {
        return result
      }
    }
    return c.json(result as never)
  }

  // Readable from `app.routes`, e.g. by an OpenAPI generator
  const { handle: _, ...validations } = options
  return Object.assign(handler, { validations })
}) as ValidatedHandlerFactory
