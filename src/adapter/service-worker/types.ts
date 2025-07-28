interface ExtendableEvent extends Event {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  waitUntil(f: Promise<any>): void
}

export interface FetchEvent extends ExtendableEvent {
  readonly clientId: string
  readonly handled: Promise<void>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly preloadResponse: Promise<any>
  readonly request: Request
  readonly resultingClientId: string
  respondWith(r: Response | PromiseLike<Response>): void
}
