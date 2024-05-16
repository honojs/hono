import { HonoRequest } from '../request.ts'

export type BodyData = Record<string, string | File | (string | File)[]>
export type ParseBodyOptions = {
  /**
   * Determines whether all fields with multiple values should be parsed as arrays.
   * @default false
   * @example
   * const data = new FormData()
   * data.append('file', 'aaa')
   * data.append('file', 'bbb')
   * data.append('message', 'hello')
   *
   * If all is false:
   * parseBody should return { file: 'bbb', message: 'hello' }
   *
   * If all is true:
   * parseBody should return { file: ['aaa', 'bbb'], message: 'hello' }
   */
  all?: boolean
}

export const parseBody = async <T extends BodyData = BodyData>(
  request: HonoRequest | Request,
  options: ParseBodyOptions = { all: false }
): Promise<T> => {
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers
  const contentType = headers.get('Content-Type')

  if (
    (contentType !== null && contentType.startsWith('multipart/form-data')) ||
    (contentType !== null && contentType.startsWith('application/x-www-form-urlencoded'))
  ) {
    return parseFormData<T>(request, options)
  }

  return {} as T
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
  const formKey = form[key]

  if (formKey && Array.isArray(formKey)) {
    ;(form[key] as (string | File)[]).push(value)
  } else if (formKey) {
    form[key] = [formKey, value]
  } else {
    form[key] = value
  }
}
