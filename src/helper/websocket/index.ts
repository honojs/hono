/**
 * @module
 * WebSocket Helper for Hono.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Context } from '../../context'
import type { MiddlewareHandler } from '../../types'

/**
 * WebSocket Event Listeners type
 */
export interface WSEvents<T = unknown> {
  onOpen?: (evt: Event, ws: WSContext<T>) => void
  onMessage?: (evt: MessageEvent<WSMessageReceive>, ws: WSContext<T>) => void
  onClose?: (evt: CloseEvent, ws: WSContext<T>) => void
  onError?: (evt: Event, ws: WSContext<T>) => void
}

/**
 * Upgrade WebSocket Type
 */
export type UpgradeWebSocket<T = unknown, U = any> = (
  createEvents: (c: Context) => WSEvents<T> | Promise<WSEvents<T>>,
  options?: U
) => MiddlewareHandler<
  any,
  string,
  {
    outputFormat: 'ws'
  }
>

export type WSReadyState = 0 | 1 | 2 | 3

export type WSContext<T = unknown> = {
  send(
    source: string | ArrayBuffer | Uint8Array,
    options?: {
      compress: boolean
    }
  ): void
  raw?: T
  binaryType: BinaryType
  readyState: WSReadyState
  url: URL | null
  protocol: string | null
  close(code?: number, reason?: string): void
}

export type WSMessageReceive = string | Blob | ArrayBufferLike

export const createWSMessageEvent = (source: WSMessageReceive): MessageEvent<WSMessageReceive> => {
  return new MessageEvent<WSMessageReceive>('message', {
    data: source,
  })
}
