import { HonoRequest } from '../request'

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

export const parseBody = async <T extends BodyData = BodyData>(
  request: HonoRequest | Request,
  options: ParseBodyOptions = { all: false }
): Promise<T> => {
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers
  const contentType = headers.get('Content-Type')

  if (isFormDataContent(contentType)) {
    return parseFormData<T>(request, options)
  }

  return {} as T
}

function isFormDataContent(contentType: string | null): boolean {
  if (contentType === null) {
    return false
  }

  return (
    contentType.startsWith('multipart/form-data') ||
    contentType.startsWith('application/x-www-form-urlencoded')
  )
}

async function parseFormData<T extends BodyData = BodyData>(
  request: HonoRequest | Request,
  options: ParseBodyOptions
): Promise<T> {
  const formData = await (request as Request).formData()

  if (formData) {
    return convertFormDataToBodyData<T>(formData, options)
  }

  return {} as T
}

function convertFormDataToBodyData<T extends BodyData = BodyData>(
  formData: FormData,
  options: ParseBodyOptions
): T {
  const form: BodyData = {}

  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith('[]')

    if (!shouldParseAllValues) {
      form[key] = value
    } else {
      handleParsingAllValues(form, key, value)
    }
  })

  return form as T
}

const handleParsingAllValues = (form: BodyData, key: string, value: FormDataEntryValue): void => {
  if (form[key] && isArrayField(form[key])) {
    appendToExistingArray(form[key] as (string | File)[], value)
  } else if (form[key]) {
    convertToNewArray(form, key, value)
  } else {
    form[key] = value
  }
}

function isArrayField(field: unknown): field is (string | File)[] {
  return Array.isArray(field)
}

const appendToExistingArray = (arr: (string | File)[], value: FormDataEntryValue): void => {
  arr.push(value)
}

const convertToNewArray = (form: BodyData, key: string, value: FormDataEntryValue): void => {
  form[key] = [form[key] as string | File, value]
}
