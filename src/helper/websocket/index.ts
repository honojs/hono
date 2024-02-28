/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Context } from '../../context'
import type { MiddlewareHandler } from '../../types'

export interface WSEvents {
  onOpen?: (evt: Event, ws: WSContext) => void
  onMessage?: (evt: MessageEvent<WSMessageReceive>, ws: WSContext) => void
  onClose?: (evt: CloseEvent, ws: WSContext) => void
  onError?: (evt: Event, ws: WSContext) => void
}
export type UpgradeWebSocket = (
  createEvents: (c: Context) => WSEvents | Promise<WSEvents>
) => MiddlewareHandler<
  any,
  string,
  {
    in: {
      json: '_websocket' | undefined
    }
  }
>

export type WSReadyState = 0 | 1 | 2 | 3
export type WSContext = {
  send(
    source: string | ArrayBuffer | Uint8Array,
    options?: {
      compress: boolean
    }
  ): void
  raw?: unknown
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
