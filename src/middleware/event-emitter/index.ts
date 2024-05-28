/**
 * @module
 * Event Emitter Middleware for Hono.
 */

import type { MiddlewareHandler } from '../../types'

export type EventKey = string | symbol
export type EventHandler<T> = (payload: T) => void
export type EventHandlers<T> = { [K in keyof T]?: EventHandler<T[K]>[] }

export interface Emitter<EventHandlerPayloads> {
  on<Key extends keyof EventHandlerPayloads>(
    type: Key,
    handler: EventHandler<EventHandlerPayloads[Key]>
  ): void
  off<Key extends keyof EventHandlerPayloads>(
    type: Key,
    handler?: EventHandler<EventHandlerPayloads[Key]>
  ): void
  emit<Key extends keyof EventHandlerPayloads>(type: Key, payload: EventHandlerPayloads[Key]): void
}

/**
 * Create Event Emitter instance.
 *
 * @param {EventHandlers} eventHandlers - Event handlers to be registered.
 * @returns {Emitter} The EventEmitter instance.
 *
 * @example
 * ```ts
 * type AvailableEvents = {
 *   // event key: payload type
 *   'foo': number;
 *   'bar': { item: { id: string }, c: Context };
 * };
 *
 * // Define event handlers
 * const handlers: EventHandlers<AvailableEvents> = {
 *   'foo': [
 *     (payload) => { console.log('Foo:', payload) }  // payload will be inferred as number
 *   ]
 * }
 *
 * // Initialize emitter with handlers
 * const ee = createEmitter<AvailableEvents>(handlers)
 *
 * // AND/OR add more listeners on the fly.
 * ee.on('bar', ({ item, c }) => {
 *   c.get('logger').log('Bar:', item.id)
 * })
 *
 * // Use the emitter to emit events.
 * ee.emit('foo', 42) // Payload will be expected to be of a type number
 * ee.emit('bar', { item: { id: '12345678' }, c }) // Payload will be expected to be of a type { item: { id: string }, c: Context }
 * ```
 */
export const createEmitter = <EventHandlerPayloads>(
  eventHandlers?: EventHandlers<EventHandlerPayloads>
): Emitter<EventHandlerPayloads> => {
  // A map of event keys and their corresponding event handlers.
  const handlers: Map<EventKey, EventHandler<unknown>[]> = eventHandlers
    ? new Map(Object.entries(eventHandlers))
    : new Map()

  return {
    /**
     * Add an event handler for the given event key.
     * @param {string|symbol} key Type of event to listen for
     * @param {Function} handler Function that is invoked when the specified event occurs
     */
    on<Key extends keyof EventHandlerPayloads>(
      key: Key,
      handler: EventHandler<EventHandlerPayloads[Key]>
    ) {
      if (!handlers.has(key as EventKey)) {
        handlers.set(key as EventKey, [])
      }
      const handlerArray = handlers.get(key as EventKey) as Array<
        EventHandler<EventHandlerPayloads[Key]>
      >
      if (!handlerArray.includes(handler)) {
        handlerArray.push(handler)
      }
    },

    /**
     * Remove an event handler for the given event key.
     * If `handler` is undefined, all handlers for the given key are removed.
     * @param {string|symbol} key Type of event to unregister `handler` from
     * @param {Function} [handler] Handler function to remove
     */
    off<Key extends keyof EventHandlerPayloads>(
      key: Key,
      handler?: EventHandler<EventHandlerPayloads[Key]>
    ) {
      if (!handler) {
        handlers.delete(key as EventKey)
      } else {
        const handlerArray = handlers.get(key as EventKey)
        if (handlerArray) {
          handlers.set(
            key as EventKey,
            handlerArray.filter((h) => h !== handler)
          )
        }
      }
    },

    /**
     * Emit an event with the given event key and payload.
     * Triggers all event handlers associated with the specified key.
     * @param {string|symbol} key The event key
     * @param {EventHandlerPayloads} [payload] Any value (preferably an object), passed to each invoked handler
     */
    emit<Key extends keyof EventHandlerPayloads>(key: Key, payload: EventHandlerPayloads[Key]) {
      const handlerArray = handlers.get(key as EventKey)
      if (handlerArray) {
        for (const handler of handlerArray) {
          handler(payload)
        }
      }
    },
  }
}

/**
 * Event Emitter Middleware for Hono.
 *
 * @see {@link https://hono.dev/middleware/builtin/event-emitter}
 *
 * @param {EventHandlers} eventHandlers - Event handlers to be registered.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * type AvailableEvents = {
 *   // event key: payload type
 *   'foo': number;
 *   'bar': { item: { id: string }, c: Context };
 * };
 *
 * // Define event handlers
 * const handlers: EventHandlers<AvailableEvents> = {
 *   'foo': [
 *     (payload) => { console.log('Foo:', payload) }  // payload will be inferred as number
 *   ]
 * }
 *
 * const app = new Hono({ Variables: { emitter: Emitter<AvailableEvents> }})
 *
 * // Register the emitter middleware and provide it with the handlers
 * app.use('\*', emitter(handlers))
 *
 * // AND/OR create event handler as "named function"
 * const barEventHandler = ({ item, c }) => {
 *   c.get('logger').log('Bar:', item.id)
 * }
 * // and register it inside middleware or route handler
 * app.use('\*', (c, next) => {
 *   c.get('emitter').on('bar', barEventHandler)
 *   return next()
 * })
 *
 * // Use the emitter in route handlers to emit events.
 * app.post('/foo', async (c) => {
 *   // The emitter is available under "emitter" key in the context.
 *   c.get('emitter').emit('foo', 42) // Payload will be expected to be of a type number
 *   c.get('emitter').emit('bar', { item: { id: '12345678' }, c }) // Payload will be expected to be of a type { item: { id: string }, c: Context }
 *   return c.text('Success')
 * })
 * ```
 */
export const emitter = <EventHandlerPayloads>(
  eventHandlers?: EventHandlers<EventHandlerPayloads>
): MiddlewareHandler => {
  // Create new instance to share with any middleware and handlers
  const instance = createEmitter<EventHandlerPayloads>(eventHandlers)
  return async function (c, next) {
    c.set('emitter', instance)
    await next()
  }
}
