import type { HonoRequest } from '../request.ts'

export type BodyData = Record<string, string | File | (string | File)[]>
export type ParseBodyOptions = {
  /**
   * Parse all fields with multiple values should be parsed as an array.
   * @default false
   * @example
   * ```ts
   * const data = new FormData()
   * data.append('file', 'aaa')
   * data.append('file', 'bbb')
   * data.append('message', 'hello')
   * ```
   *
   * If `all` is `false`:
   * parseBody should return `{ file: 'bbb', message: 'hello' }`
   *
   * If `all` is `true`:
   * parseBody should return `{ file: ['aaa', 'bbb'], message: 'hello' }`
   */
  all?: boolean
}

const isArrayField = (value: unknown): value is (string | File)[] => {
  return Array.isArray(value)
}

export const parseBody = async <T extends BodyData = BodyData>(
  request: HonoRequest | Request,
  options: ParseBodyOptions = {
    all: false,
  }
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
      formData.forEach((value, key) => {
        const shouldParseAllValues = options.all || key.slice(-2) === '[]'

        if (!shouldParseAllValues) {
          form[key] = value // override if same key
          return
        }

        if (form[key] && isArrayField(form[key])) {
          ;(form[key] as (string | File)[]).push(value) // append if same key
          return
        }

        if (form[key]) {
          form[key] = [form[key] as string | File, value] // convert to array if multiple values
          return
        }

        form[key] = value
      })
      body = form
    }
  }
  return body as T
}
