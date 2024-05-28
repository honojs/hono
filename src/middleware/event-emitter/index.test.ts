import { Hono } from '../../hono'
import { expect, vi } from 'vitest'
import { createEmitter, emitter } from './index'
import type { Emitter, EventHandlers } from './index'

describe('EventEmitter', () => {
  describe('Used inside of route handlers', () => {
    it('Should work when subscribing to events inside of route handler', async () => {
      type EventHandlerPayloads = {
        'todo:created': { id: string; text: string }
      }

      const handler = () => {}

      const spy = vi.fn(handler)

      const app = new Hono<{ Variables: { emitter: Emitter<EventHandlerPayloads> } }>()

      app.use('*', emitter())

      app.use((c, next) => {
        c.get('emitter').on('todo:created', spy)
        return next()
      })

      app.post('/todo', (c) => {
        c.get('emitter').emit('todo:created', { id: '2', text: 'Buy milk' })
        return c.json({ message: 'Todo created' })
      })

      const res = await app.request('http://localhost/todo', { method: 'POST' })
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(spy).toHaveBeenCalledWith({ id: '2', text: 'Buy milk' })
    })

    it('Should not subscribe same handler to same event twice inside of route handler', async () => {
      type EventHandlerPayloads = {
        'todo:created': { id: string; text: string }
      }

      const handler = () => {}

      const spy = vi.fn(handler)

      const app = new Hono<{ Variables: { emitter: Emitter<EventHandlerPayloads> } }>()

      app.use('*', emitter())

      app.use((c, next) => {
        c.get('emitter').on('todo:created', spy)
        return next()
      })

      app.post('/todo', (c) => {
        c.get('emitter').emit('todo:created', { id: '2', text: 'Buy milk' })
        return c.json({ message: 'Todo created' })
      })

      await app.request('http://localhost/todo', { method: 'POST' })
      await app.request('http://localhost/todo', { method: 'POST' })
      await app.request('http://localhost/todo', { method: 'POST' })
      expect(spy).toHaveBeenCalledTimes(3)
    })

    it('Should work assigning event handlers via middleware', async () => {
      type EventHandlerPayloads = {
        'todo:created': { id: string; text: string }
      }

      const handlers: EventHandlers<EventHandlerPayloads> = {
        'todo:created': [vi.fn(() => {})],
      }

      const app = new Hono<{ Variables: { emitter: Emitter<EventHandlerPayloads> } }>()

      app.use('*', emitter(handlers))

      app.post('/todo', (c) => {
        c.get('emitter').emit('todo:created', { id: '2', text: 'Buy milk' })
        return c.json({ message: 'Todo created' })
      })

      const res = await app.request('http://localhost/todo', { method: 'POST' })
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(handlers['todo:created']?.[0]).toHaveBeenCalledWith({ id: '2', text: 'Buy milk' })
    })
  })

  describe('Used as standalone', () => {
    it('Should work assigning event handlers via createEmitter function param', async () => {
      type EventHandlerPayloads = {
        'todo:created': { id: string; text: string }
        'todo:deleted': { id: string }
      }

      const handlers: EventHandlers<EventHandlerPayloads> = {
        'todo:created': [vi.fn(() => {})],
      }

      const ee = createEmitter<EventHandlerPayloads>(handlers)

      const todoDeletedHandler = vi.fn(() => {})

      ee.on('todo:deleted', todoDeletedHandler)

      const app = new Hono<{ Variables: { emitter: Emitter<EventHandlerPayloads> } }>()

      app.post('/todo', (c) => {
        ee.emit('todo:created', { id: '2', text: 'Buy milk' })
        return c.json({ message: 'Todo created' })
      })

      app.post('/todo/123', (c) => {
        ee.emit('todo:deleted', { id: '3' })
        return c.json({ message: 'Todo deleted' })
      })

      const res = await app.request('http://localhost/todo', { method: 'POST' })
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(handlers['todo:created']?.[0]).toHaveBeenCalledWith({ id: '2', text: 'Buy milk' })
      const res2 = await app.request('http://localhost/todo/123', { method: 'POST' })
      expect(res2).not.toBeNull()
      expect(res2.status).toBe(200)
      expect(todoDeletedHandler).toHaveBeenCalledWith({ id: '3' })
    })

    it('Should work assigning event handlers via standalone on()', async () => {
      type EventHandlerPayloads = {
        'todo:created': { id: string; text: string }
        'todo:deleted': { id: string }
      }

      const ee = createEmitter<EventHandlerPayloads>()

      const todoDeletedHandler = () => {}

      const spy = vi.fn(todoDeletedHandler)

      ee.on('todo:deleted', spy)

      const app = new Hono<{ Variables: { emitter: Emitter<EventHandlerPayloads> } }>()

      app.post('/todo', (c) => {
        ee.emit('todo:deleted', { id: '2' })
        return c.json({ message: 'Todo created' })
      })

      const res = await app.request('http://localhost/todo', { method: 'POST' })
      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(spy).toHaveBeenCalledWith({ id: '2' })
    })

    it('Should work removing event handlers via off() method', async () => {
      type EventHandlerPayloads = {
        'todo:created': { id: string; text: string }
        'todo:deleted': { id: string }
      }

      const ee = createEmitter<EventHandlerPayloads>()

      const todoDeletedHandler = () => {}

      const spy = vi.fn(todoDeletedHandler)

      ee.on('todo:deleted', spy)

      const app = new Hono<{ Variables: { emitter: Emitter<EventHandlerPayloads> } }>()

      app.post('/todo', (c) => {
        ee.emit('todo:deleted', { id: '2' })
        ee.off('todo:deleted', spy)
        return c.json({ message: 'Todo created' })
      })

      await app.request('http://localhost/todo', { method: 'POST' })
      await app.request('http://localhost/todo', { method: 'POST' })
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('Should work removing all event handlers via off() method not providing handler as second argument', async () => {
      type EventHandlerPayloads = {
        'todo:deleted': { id: string }
      }

      const ee = createEmitter<EventHandlerPayloads>()

      const todoDeletedHandler = () => {}
      const todoDeletedHandler2 = () => {}

      const spy = vi.fn(todoDeletedHandler)
      const spy2 = vi.fn(todoDeletedHandler2)

      ee.on('todo:deleted', spy)
      ee.on('todo:deleted', spy2)

      const app = new Hono<{ Variables: { emitter: Emitter<EventHandlerPayloads> } }>()

      app.post('/todo', (c) => {
        ee.emit('todo:deleted', { id: '2' })
        ee.off('todo:deleted')
        return c.json({ message: 'Todo created' })
      })

      await app.request('http://localhost/todo', { method: 'POST' })
      await app.request('http://localhost/todo', { method: 'POST' })
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy2).toHaveBeenCalledTimes(1)
    })
  })
})
