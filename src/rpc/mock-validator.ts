import type { ZodType } from 'zod'
import type { z } from 'zod'
import type { Handler, Environment, ValidationTypes } from '../types'

// This is just a mock. Using only for testing.
export function mockValidator<
  T extends ZodType,
  Type extends ValidationTypes,
  Method extends string,
  S
>(
  _type: Type,
  schema: T
): Handler<
  string,
  Method,
  Environment,
  {
    [K in Method]: { type: Type; data: z.infer<T> }
  } & S,
  z.infer<T> // Actually, this is not necessary, but without it the test will fail.
> {
  return async (c, next) => {
    const parsed = schema.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.text('Invalid!', 400)
    }
    const data: T = parsed.data
    c.req.valid(data)
    await next()
  }
}
