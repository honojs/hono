import type { Context } from '../../context'
import { HTTPException } from '../../http-exception'
import type {
  Env,
  FormValue,
  Handler,
  IntersectNonAnyTypes,
  MiddlewareHandler,
  TypedResponse,
  ValidationTargets,
} from '../../types'
import type { HtmlEscaped } from '../../utils/html'
import type { ContentfulStatusCode } from '../../utils/http-status'
import type { JSONParsed } from '../../utils/types'
import type { InferInput } from '../../validator/utils'
import { getValidationTarget } from '../../validator/validator'

type StandardSchemaIssue = {
  readonly message: string
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined
}

type StandardSchemaResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<StandardSchemaIssue> }

/**
 * The part of the Standard Schema interface used by `defineHandler()`.
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

/**
 * A Response the handler can return. A JSON Response by `c.json()` is not accepted,
 * because it bypasses the response validation. Return the value instead.
 */
type NonJSONResponse = Response & { readonly _format?: 'text' | 'redirect' | 'body' }

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

/** The validated values, passed to the handler as the second argument */
type HandlerInput<T extends Targets> = { [K in ValidatedTarget<T>]: OutputOf<T[K]> }

type JSONResponseOf<T> = Response & TypedResponse<JSONParsed<T>, ContentfulStatusCode, 'json'>

/** The Response that `toResponse()` converts a returned value to */
type ConvertedResponse<R> = [unknown] extends [R]
  ? Response
  : R extends AnyResponse
    ? R
    : R extends null | undefined | void
      ? Response & TypedResponse<null, 204, 'body'>
      : R extends string | HtmlEscaped
        ? Response
        : JSONResponseOf<R>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMiddleware = MiddlewareHandler<any, any, any>

// The Env of each middleware, e.g. `Variables` set by `c.set()`
type MiddlewareEnvs<M extends AnyMiddleware[]> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof M]: M[K] extends MiddlewareHandler<infer ME, any, any> ? ME : never
}

/**
 * An issue in the failure response. `path` is dot-joined, e.g. `user.email`.
 * The input value is not included.
 */
export type ValidationIssue = { message: string; path?: string }

/** The issues of one validation target in the failure response */
export type ValidationFailure = { slot: RequestTarget | 'response'; issues: ValidationIssue[] }

type ValidatedHandlerOptions<Param, Query, Header, Cookie, Form, Json, ResponseIn, ResponseOut> = {
  param?: Validation<ValidationTargets['param'], Param>
  query?: Validation<ValidationTargets['query'], Query>
  header?: Validation<ValidationTargets['header'], Header>
  cookie?: Validation<ValidationTargets['cookie'], Cookie>
  form?: Validation<ValidationTargets['form'], Form>
  json?: Validation<ValidationTargets['json'], Json>
  response?: ResponseValidation<ResponseIn, ResponseOut>
}

const requestTargets: RequestTarget[] = ['param', 'query', 'header', 'cookie', 'form', 'json']

const isStandardSchema = (v: unknown): v is AnyStandardSchema =>
  (typeof v === 'object' || typeof v === 'function') && v !== null && '~standard' in v

const toValidationIssues = (issues: ReadonlyArray<StandardSchemaIssue>): ValidationIssue[] =>
  issues.map(({ message, path }) =>
    path
      ? { message, path: path.map((p) => String(typeof p === 'object' ? p.key : p)).join('.') }
      : { message }
  )

type Validator = {
  target: RequestTarget
  schema?: AnyStandardSchema['~standard']['validate']
  fn?: (value: unknown, c: Context) => unknown
}

const toValidator = (target: RequestTarget, v: Validation<unknown, unknown>): Validator =>
  isStandardSchema(v) ? { target, schema: v['~standard'].validate } : { target, fn: v }

type ValidatedHandler<E extends Env, P extends string, T extends Targets, ResponseOut, R> = Handler<
  E,
  P,
  ValidatedInput<T>,
  Promise<
    [ResponseOut] extends [never]
      ? ConvertedResponse<Awaited<R>>
      : JSONResponseOf<OutputOf<ResponseOut>>
  >
>

export interface DefineHandler<E extends Env, P extends string> {
  /**
   * Defines a handler, with middleware before it. The returned value is converted to a Response.
   */
  <E2 extends Env = E, P2 extends string = P, M extends AnyMiddleware[] = [], R = unknown>(
    ...args: [
      ...middleware: M,
      handler: (c: Context<IntersectNonAnyTypes<[E2, ...MiddlewareEnvs<M>]>, P2>) => R,
    ]
  ): Handler<E2, P2, {}, Promise<ConvertedResponse<Awaited<R>>>>
  /**
   * Defines a handler with request and response validation, with middleware before it.
   */
  <
    Param = never,
    Query = never,
    Header = never,
    Cookie = never,
    Form = never,
    Json = never,
    // Not inferred without `response`, so the handler can return anything
    ResponseIn = unknown,
    ResponseOut = never,
    T extends Targets = {
      param: Param
      query: Query
      header: Header
      cookie: Cookie
      form: Form
      json: Json
    },
  >(
    options: ValidatedHandlerOptions<
      Param,
      Query,
      Header,
      Cookie,
      Form,
      Json,
      ResponseIn,
      ResponseOut
    >
  ): <
    E2 extends Env = E,
    P2 extends string = P,
    M extends AnyMiddleware[] = [],
    R extends ResponseIn | NonJSONResponse | Promise<ResponseIn | NonJSONResponse> = ResponseIn,
  >(
    ...args: [
      ...middleware: M,
      handler: (
        c: Context<IntersectNonAnyTypes<[E2, ...MiddlewareEnvs<M>]>, P2, ValidatedInput<T>>,
        input: HandlerInput<T>
      ) => R,
    ]
  ) => ValidatedHandler<E2, P2, T, ResponseOut, R>
}

const toResponse = (c: Context, result: unknown): Response | Promise<Response> => {
  if (result instanceof Response) {
    return result
  }
  if (result === null || result === undefined) {
    return c.body(null, 204)
  }
  // JSX and `html` tagged templates are HtmlEscaped objects
  return typeof result === 'string' || (result as HtmlEscaped).isEscaped
    ? c.html(result as string)
    : c.json(result as never)
}

/**
 * `defineHandler()` defines a handler. A value returned from the handler is converted to a
 * Response: an object is returned as JSON, a string or JSX as HTML, and `null` or `undefined`
 * as `204 No Content`. A `Response` is returned as is. The status is set with `c.status()`, and
 * it is not in the types. Return `c.json()` to have the status in the types.
 *
 * With options, each request target (`param`, `query`, `json`, `form`, `header`, `cookie`)
 * is validated before the handler runs. The validated values are passed to the handler as
 * the second argument, and are also available through `c.req.valid()`.
 * A value returned from the handler is validated with `response` and returned as JSON.
 *
 * Each validation accepts a Standard Schema or a validation function.
 * When a Standard Schema fails, an `HTTPException` is thrown with status 400 for the request
 * and 500 for the response, so `onError` can handle it. Its `res` is a JSON response of
 * `{ error, issues }`, and its `cause` is `{ issues }` with the raw Standard Schema issues.
 *
 * Middleware passed before the handler runs first, around the validation. Its Env flows into
 * the handler, so `c.get()` is typed. Otherwise, use `createFactory<Env>().defineHandler`, or
 * pass the Env and the path as type arguments.
 *
 * @see {@link https://hono.dev/docs/helpers/factory#definehandler}
 *
 * @experimental
 * `defineHandler()` is an experimental feature.
 * The API might be changed.
 *
 * @example
 * ```ts
 * app.get('/ping', defineHandler(() => ({ pong: true })))
 * app.get('/me', defineHandler(auth, (c) => c.get('user')))
 *
 * app.post(
 *   '/users/:id',
 *   defineHandler({
 *     param: ParamSchema,
 *     json: BodySchema,
 *     response: UserSchema,
 *   })(async (c, { param, json }) => {
 *     c.status(201)
 *     return { id: param.id, ...json }
 *   })
 * )
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const defineHandler: DefineHandler<any, any> = ((
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  if (typeof args[0] === 'function') {
    return compose(args, async (c) => toResponse(c, await args[args.length - 1](c)))
  }
  const options = args[0]
  const validators = requestTargets
    .filter((target) => options[target])
    .map((target) => toValidator(target, options[target]))
  const response = options.response && toValidator('json', options.response)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (...args: any[]) => {
    const handler: (c: Context, input: unknown) => unknown = args[args.length - 1]
    const run = async (c: Context): Promise<Response> => {
      const input: Record<string, unknown> = {}
      const failures: ValidationFailure[] = []
      const issues: { slot: string; issues: ReadonlyArray<StandardSchemaIssue> }[] = []

      for (const { target, schema, fn } of validators) {
        let value = getValidationTarget(c, target)
        if (value instanceof Promise) {
          value = await value
        }
        if (schema) {
          let result = schema(value)
          if (result instanceof Promise) {
            result = await result
          }
          if (result.issues) {
            failures.push({ slot: target, issues: toValidationIssues(result.issues) })
            issues.push({ slot: target, issues: result.issues })
            continue
          }
          value = result.value
        } else {
          value = fn!(value, c)
          if (value instanceof Promise) {
            value = await value
          }
          if (value instanceof Response) {
            return value
          }
        }
        c.req.addValidatedData(target, value as never)
        input[target] = value
      }

      if (failures.length) {
        throw new HTTPException(400, {
          res: c.json({ error: 'Validation failed', issues: failures }, 400),
          cause: { issues },
        })
      }

      let result: unknown = handler(c, input)
      if (result instanceof Promise) {
        result = await result
      }
      if (result instanceof Response) {
        return result
      }

      if (response) {
        if (response.schema) {
          let validated = response.schema(result)
          if (validated instanceof Promise) {
            validated = await validated
          }
          if (validated.issues) {
            throw new HTTPException(500, {
              res: c.json({ error: 'Response validation failed' }, 500),
              cause: { issues: [{ slot: 'response', issues: validated.issues }] },
            })
          }
          result = validated.value
        } else {
          result = response.fn!(result, c)
          if (result instanceof Promise) {
            result = await result
          }
          if (result instanceof Response) {
            return result
          }
        }
        return c.json(result as never)
      }

      return toResponse(c, result)
    }

    // Readable from `app.routes`, e.g. by an OpenAPI generator
    return Object.assign(compose(args, run), { validations: options })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as DefineHandler<any, any>

/**
 * Runs the middleware (all but the last argument) around `run`,
 * so code after `await next()` runs after the handler.
 */
const compose = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[],
  run: (c: Context) => Promise<Response>
): ((c: Context) => Promise<Response>) => {
  const middleware: MiddlewareHandler[] = args.slice(0, -1)
  if (!middleware.length) {
    return run
  }
  return async (c) => {
    const dispatch = async (i: number): Promise<void> => {
      if (i === middleware.length) {
        c.res = await run(c)
        return
      }
      const res = await middleware[i](c, () => dispatch(i + 1))
      if (res) {
        c.res = res
      }
    }
    await dispatch(0)
    return c.res
  }
}
