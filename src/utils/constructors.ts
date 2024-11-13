export const newRequest = (input: RequestInfo | URL, init?: RequestInit): Request => {
  return new Request(input, init)
}

export const newResponse = (body?: BodyInit | null, init?: ResponseInit): Response => {
  return new Response(body, init)
}

export const newHeaders = (init?: HeadersInit): Headers => {
  return new Headers(init)
}
