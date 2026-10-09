import { Hono } from 'hono'
import { createFactory } from 'hono/factory'

// Inferred types like these mention internal aliases from hono's declarations
// (for example the return type of `c.json()`). Consumers that build with
// `declaration: true` must be able to emit them without naming those aliases.
export const handlers = createFactory().createHandlers((c) => c.json({ ok: true }))

export const app = new Hono().get('/', (c) => c.json({ ok: true }))
export type AppType = typeof app
