---
'hono': patch
---

Fixed `app.on()` type inference when multiple paths are combined with middleware: an inline middleware whose inferred return type is `Promise<void>` (e.g. an `async` function returning `next()`) made the `path[]` overload infer `R = Promise<void>` for **every** handler, so the final handler returning a JSON response was rejected with "No overload matches this call". The `path[]` overload now mirrors the single-path and `method[]` overloads: only the last handler carries the response type, and preceding handlers are treated as middleware.
