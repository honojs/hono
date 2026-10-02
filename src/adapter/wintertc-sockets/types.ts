/**
 * Information about a socket connection.
 * @see https://sockets-api.proposal.wintertc.org/#socketinfo-dictionary
 */
export interface SocketInfo {
  remoteAddress?: string | null
  localAddress?: string | null
}

/**
 * The subset of a WinterTC `Socket` used by this adapter.
 * @see https://sockets-api.proposal.wintertc.org/#socket-section
 */
export interface WinterTCSocket {
  readonly readable: ReadableStream<Uint8Array>
  readonly writable: WritableStream<Uint8Array>
  readonly opened?: Promise<SocketInfo>
  close(): Promise<void> | void
}

export interface ServeSocketOptions {
  /**
   * Scheme used to build the request URL.
   * @default 'http'
   */
  scheme?: 'http' | 'https'
  /**
   * Maximum size in bytes of the request line and headers.
   * Larger requests are answered with `431 Request Header Fields Too Large`.
   * @default 16384
   */
  maxHeaderSize?: number
  /**
   * Whether to serve more than one request per connection.
   * @default true
   */
  keepAlive?: boolean
  /**
   * Extra bindings merged into `c.env`.
   */
  env?: object
}

/**
 * Bindings available as `c.env` in handlers served by this adapter.
 */
export type SocketBindings = {
  socket: WinterTCSocket
  info?: SocketInfo
}
