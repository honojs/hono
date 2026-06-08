import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'
import type { BlockingResponse, WebRequestDetails } from './types'

type Handler = (details: WebRequestDetails) => Promise<BlockingResponse | undefined>

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const buildRequestBody = (details: WebRequestDetails): BodyInit | undefined => {
  const { requestBody } = details
  if (!requestBody) {
    return undefined
  }

  if (requestBody.raw) {
    const parts = requestBody.raw.filter(
      (part): part is { bytes: ArrayBuffer } => part.bytes !== undefined
    )
    if (parts.length === 0) {
      return undefined
    }
    if (parts.length === 1) {
      return parts[0].bytes
    }
    const totalLength = parts.reduce((sum, p) => sum + p.bytes.byteLength, 0)
    const merged = new Uint8Array(totalLength)
    let offset = 0
    for (const part of parts) {
      merged.set(new Uint8Array(part.bytes), offset)
      offset += part.bytes.byteLength
    }
    return merged.buffer
  }

  if (requestBody.formData) {
    const params = new URLSearchParams()
    for (const [key, values] of Object.entries(requestBody.formData)) {
      for (const value of values) {
        params.append(key, value)
      }
    }
    return params.toString()
  }

  return undefined
}

const responseToDataUrl = async (res: Response): Promise<string> => {
  const body = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'text/plain'
  return `data:${contentType};base64,${arrayBufferToBase64(body)}`
}

export const handle = <E extends Env, S extends Schema, BasePath extends string>(
  app: Hono<E, S, BasePath>
): Handler => {
  return async (details) => {
    const body = buildRequestBody(details)
    const requestInit: RequestInit = {
      method: details.method,
      ...(body !== undefined ? { body } : {}),
    }

    if (body !== undefined && typeof body === 'string') {
      requestInit.headers = { 'content-type': 'application/x-www-form-urlencoded' }
    }

    const request = new Request(details.url, requestInit)
    const res = await app.fetch(request)

    if (res.status === 404) {
      return undefined
    }

    return { redirectUrl: await responseToDataUrl(res) }
  }
}
