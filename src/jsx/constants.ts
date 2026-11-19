export const DOM_RENDERER = Symbol('RENDERER')
export const DOM_ERROR_HANDLER = Symbol('ERROR_HANDLER')
export const DOM_STASH = Symbol('STASH')
export const DOM_INTERNAL_TAG = Symbol('INTERNAL')
export const DOM_MEMO = Symbol('MEMO')
export const PERMALINK = Symbol('PERMALINK')
// shared with `hono/jsx/signal`, so that the renderers can detect a signal without importing it
export const SIGNAL: unique symbol = Symbol.for('hono.signal')

// Call with a function to run it and track the signals read in it. Call with no arguments to stop tracking.
export type SignalScope = <T>(fn?: () => T) => T
// `hono/jsx/signal` registers itself here when it is loaded, so that the DOM renderer can track the
// signals read in a component without importing it
export const signalHook: {
  s?: (onChange: () => void) => SignalScope // create a scope for a component in the DOM renderer
  r?: <T>(fn: () => T) => T // run a component on the server
} = {}
