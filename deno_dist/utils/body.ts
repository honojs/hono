import { HonoRequest } from '../request.ts'

type BodyDataValue = string | {} | File | (string | File)[] | { [key: string]: BodyDataValue }
export type BodyData = Record<string, BodyDataValue>
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
  /**
   * Determines whether all fields with dot notation should be parsed as nested objects.
   * @default false
   * @example
   * const data = new FormData()
   * data.append('obj.key1', 'value1')
   * data.append('obj.key2', 'value2')
   *
   * If dot is false:
   * parseBody should return { 'obj.key1': 'value1', 'obj.key2': 'value2' }
   *
   * If dot is true:
   * parseBody should return { obj: { key1: 'value1', key2: 'value2' } }
   */
  dot?: boolean
}

export const parseBody = async <T extends BodyData = BodyData>(
  request: HonoRequest | Request,
  options: ParseBodyOptions = {}
): Promise<T> => {
  const { all = options?.all ?? false, dot = options?.dot ?? false } = options

  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers
  const contentType = headers.get('Content-Type')

  if (
    (contentType !== null && contentType.startsWith('multipart/form-data')) ||
    (contentType !== null && contentType.startsWith('application/x-www-form-urlencoded'))
  ) {
    return parseFormData<T>(request, { ...options, all, dot })
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
      handleNestedValues(form, key, value, options.dot)
    } else {
      handleParsingAllValues(form, key, value, options.dot)
    }
  })

  return form as T
}

const handleParsingAllValues = (
  form: BodyData,
  key: string,
  value: FormDataEntryValue,
  dot?: boolean
): void => {
  const formKey = form[key]

  if (formKey && Array.isArray(formKey)) {
    ;(form[key] as (string | File)[]).push(value)
  } else if (formKey) {
    form[key] = [formKey, value]
  } else {
    handleNestedValues(form, key, value, dot)
  }
}

const handleNestedValues = (
  form: BodyData,
  key: string,
  value: FormDataEntryValue,
  dot?: boolean
): void => {
  if (dot && key.includes('.')) {
    let nestedForm = form

    const keys = key.split('.')

    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        nestedForm[key] = value
      } else {
        if (
          !nestedForm[key] ||
          typeof nestedForm[key] !== 'object' ||
          Array.isArray(nestedForm[key])
        ) {
          nestedForm[key] = nestedForm[key] || {}
        }
        nestedForm = nestedForm[key] as BodyData
      }
    })
  } else {
    form[key] = value
  }
}
