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
   * ```
   *
   * If `all` is `false`:
   * parseBody should return `{ file: 'bbb' }`
   *
   * If `all` is `true`:
   * parseBody should return `{ file: ['aaa', 'bbb'] }`
   */
  all?: boolean
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
        const isParseAll = options.all || key.slice(-2) === '[]'

        if (!isParseAll) {
          form[key] = value
          return
        }

        form[key] ??= []
        if (Array.isArray(form[key])) {
          ;(form[key] as (string | File)[]).push(value)
          return
        }
      })
      body = form
    }
  }
  return body as T
}
