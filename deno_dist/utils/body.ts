import type { HonoRequest } from '../request.ts'

export type BodyData = Record<string, string | File | (string | File)[]>

export const parseBody = async <T extends BodyData = BodyData>(
  request: HonoRequest | Request
): Promise<T> => {
  let body: BodyData = {}
  const contentType = request.headers.get('Content-Type')

  if (
    contentType &&
    (contentType.startsWith('multipart/form-data') ||
      contentType.startsWith('application/x-www-form-urlencoded'))
  ) {
    const formData = await request.formData()
    if (formData) {
      const form: BodyData = {}
      for (const key of formData.keys()) {
        const values = formData.getAll(key)
        form[key] = values.length === 1 ? values[0] : values
      }
      body = form
    }
  }
  return body as T
}
