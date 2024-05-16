import { HonoRequest } from '../request.ts'

type BodyDataValue = string | File | (string | File)[] | { [key: string]: BodyDataValue }
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
  all: boolean
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
  dot: boolean
}

/**
 * Parses the body of a request based on the provided options.
 *
 * @template T - The type of the parsed body data.
 * @param {HonoRequest | Request} request - The request object to parse.
 * @param {Partial<ParseBodyOptions>} [options] - Options for parsing the body.
 * @returns {Promise<T>} The parsed body data.
 */
export const parseBody = async <T extends BodyData = BodyData>(
  request: HonoRequest | Request,
  options: Partial<ParseBodyOptions> = Object.create(null)
): Promise<T> => {
  const { all = false, dot = false } = options

  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers
  const contentType = headers.get('Content-Type')

  if (
    (contentType !== null && contentType.startsWith('multipart/form-data')) ||
    (contentType !== null && contentType.startsWith('application/x-www-form-urlencoded'))
  ) {
    return parseFormData<T>(request, { all, dot })
  }

  return {} as T
}

/**
 * Parses form data from a request.
 *
 * @template T - The type of the parsed body data.
 * @param {HonoRequest | Request} request - The request object containing form data.
 * @param {ParseBodyOptions} options - Options for parsing the form data.
 * @returns {Promise<T>} The parsed body data.
 */
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

/**
 * Converts form data to body data based on the provided options.
 *
 * @template T - The type of the parsed body data.
 * @param {FormData} formData - The form data to convert.
 * @param {ParseBodyOptions} options - Options for parsing the form data.
 * @returns {T} The converted body data.
 */
function convertFormDataToBodyData<T extends BodyData = BodyData>(
  formData: FormData,
  options: ParseBodyOptions
): T {
  const form: BodyData = Object.create(null)

  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith('[]')

    if (shouldParseAllValues) {
      handleParsingAllValues(form, key, value)
    } else {
      form[key] = value
    }
  })

  if (options.dot) {
    const nestedForm: BodyData = Object.create(null)

    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes('.')

      if (shouldParseDotValues) {
        handleParsingNestedValues(nestedForm, key, value)
      } else {
        nestedForm[key] = value
      }
    })

    return nestedForm as T
  }

  return form as T
}

/**
 * Handles parsing all values for a given key, supporting multiple values as arrays.
 *
 * @param {BodyData} form - The form data object.
 * @param {string} key - The key to parse.
 * @param {FormDataEntryValue} value - The value to assign.
 */
const handleParsingAllValues = (form: BodyData, key: string, value: FormDataEntryValue): void => {
  if (form[key] !== undefined) {
    if (Array.isArray(form[key])) {
      ;(form[key] as (string | File)[]).push(value)
    } else {
      form[key] = [form[key] as string | File, value]
    }
  } else {
    form[key] = value
  }
}

/**
 * Handles parsing nested values using dot notation keys.
 *
 * @param {BodyData} form - The form data object.
 * @param {string} key - The dot notation key.
 * @param {BodyDataValue} value - The value to assign.
 */
const handleParsingNestedValues = (form: BodyData, key: string, value: BodyDataValue): void => {
  let nestedForm = form
  const keys = key.split('.')

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      nestedForm[key] = value
    } else {
      if (
        !nestedForm[key] ||
        typeof nestedForm[key] !== 'object' ||
        Array.isArray(nestedForm[key]) ||
        nestedForm[key] instanceof File
      ) {
        nestedForm[key] = Object.create(null)
      }
      nestedForm = nestedForm[key] as BodyData
    }
  })
}
