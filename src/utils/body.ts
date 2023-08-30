import type { HonoRequest } from '../request'

export type BodyData = Record<string, string | File>

/**
 * To reduce the bundle size, make them as variables.
 */
const _multipartFormData = 'multipart/form-data'
const _formUrlEncoded = 'application/x-www-form-urlencoded'
const _decodeURIComponent = decodeURIComponent

export const parseBody = async <T extends BodyData = BodyData>(
  request: HonoRequest | Request,
  arrayBuffer?: ArrayBuffer
): Promise<T> => {
  let body: BodyData = {}
  const contentType = request.headers.get('Content-Type')

  if (contentType) {
    let formData: FormData | undefined
    if (arrayBuffer) {
      formData = arrayBufferToFormData(arrayBuffer, contentType)
    } else if (
      contentType.startsWith(_multipartFormData) ||
      contentType.startsWith(_formUrlEncoded)
    ) {
      formData = await request.formData()
    }
    if (formData) {
      const form: BodyData = {}
      formData.forEach((value, key) => {
        form[key] = value
      })
      body = form
    }
  }
  return body as T
}

const arrayBufferToFormData = (arrayBuffer: ArrayBuffer, contentType: string) => {
  const decoder = new TextDecoder('utf-8')
  const content = decoder.decode(arrayBuffer)
  const formData = new FormData()

  const boundaryMatch = contentType.match(/boundary=(.+)/)
  const boundary = boundaryMatch ? boundaryMatch[1] : ''

  if (contentType.startsWith(_multipartFormData) && boundary) {
    const parts = content.split('--' + boundary).slice(1, -1)
    for (const part of parts) {
      const [header, body] = part.split('\r\n\r\n')
      const nameMatch = header.match(/name="([^"]+)"/)
      if (nameMatch) {
        const name = nameMatch[1]
        formData.append(name, body.trim())
      }
    }
  } else if (contentType.startsWith(_formUrlEncoded)) {
    const pairs = content.split('&')
    for (const pair of pairs) {
      const [key, value] = pair.split('=')
      formData.append(_decodeURIComponent(key), _decodeURIComponent(value))
    }
  }

  return formData
}
