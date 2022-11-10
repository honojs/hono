import type { Context } from './context'
import type { Schema } from './validator/schema'

export interface ContextVariableMap {}

export type Bindings = Record<string, any> // For Cloudflare Workers
export type Variables = Record<string, any> // For c.set/c.get functions
export type Environment = {
  Bindings: Bindings
  Variables: Variables
}

export type Handler<
  P extends string = string,
  E extends Partial<Environment> = Environment,
  S extends Partial<Schema> = Schema
> = (c: Context<P, E, S>, next: Next) => Response | Promise<Response | undefined | void>

export type MiddlewareHandler<
  P extends string = string,
  E extends Partial<Environment> = Environment,
  S extends Partial<Schema> = Schema
> = (c: Context<P, E, S>, next: Next) => Promise<Response | undefined | void>

export type NotFoundHandler<E extends Partial<Environment> = Environment> = (
  c: Context<string, E>
) => Response | Promise<Response>

export type ErrorHandler<E extends Partial<Environment> = Environment> = (
  err: Error,
  c: Context<string, E>
) => Response

export type Next = () => Promise<void>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ParamKeyName<NameWithPattern> = NameWithPattern extends `${infer Name}{${infer _Pattern}`
  ? Name
  : NameWithPattern

type ParamKey<Component> = Component extends `:${infer NameWithPattern}`
  ? ParamKeyName<NameWithPattern>
  : never

export type ParamKeys<Path> = Path extends `${infer Component}/${infer Rest}`
  ? ParamKey<Component> | ParamKeys<Rest>
  : ParamKey<Path>

// This is not used for internally
// Will be used by users as `Handler`
export interface CustomHandler<
  P extends string | Partial<Environment> | Schema = string,
  E = Partial<Environment> | Partial<Schema>,
  S = Partial<Schema>
> {
  (
    c: Context<
      P extends string
        ? P
        : P extends Partial<Environment>
        ? string
        : P extends Partial<Schema>
        ? string
        : never,
      P extends Partial<Environment>
        ? P
        : P extends Partial<Schema>
        ? Partial<Environment>
        : E extends Partial<Environment>
        ? E extends Partial<Schema>
          ? Environment
          : E
        : E extends Partial<Schema>
        ? Partial<Environment>
        : Environment,
      S extends Schema ? S : P extends Schema ? P : E extends Schema ? E : any
    >,
    next: Next
  ): Response | Promise<Response | undefined | void>
}
