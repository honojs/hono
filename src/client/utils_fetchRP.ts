const nullBodyResponses = new Set([101, 204, 205, 304])

export type PossibleResponseTypes = 'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text'

export interface FetchRPOptions {
  /**
   * Customize the function used to detect the response type.
   *
   * Can also be used to force the response type: `detectResponseType: () => 'blob'`
   */
  detectResponseType?: (response: Response) => PossibleResponseTypes
}

/**
 * Smartly parses and return the consumable result from a fetch `Response`.
 *
 * Optionally, customize the behaviors via `options` {@link FetchRPOptions}.
 */
export async function fetchRP(
  fetchRes: Response | Promise<Response>,
  options?: FetchRPOptions
): Promise<any> {
  const _fetchRes = (await fetchRes) as unknown as Response & { _data: any }

  const hasBody = _fetchRes.body && !nullBodyResponses.has(_fetchRes.status)

  if (hasBody) {
    const responseType = (options?.detectResponseType ?? detectResponseType)(_fetchRes)

    // ~We override the `.json()` method to parse the body more securely with `destr`~
    // $HONO: This inlined version for `hono` removes `destr` and uses `.json()` directly.
    switch (responseType) {
      default: {
        _fetchRes._data = await _fetchRes[responseType]()
      }
    }
  }

  if (!_fetchRes.ok) {
    throw createFetchError(_fetchRes)
  }

  return _fetchRes._data
}

export function createFetchError(fetchRes?: Response): DetailedError {
  const statusStr = fetchRes ? `${fetchRes.status} ${fetchRes.statusText}` : '<no response>'

  const message = `${statusStr}`

  return new DetailedError(message, {
    statusCode: fetchRes?.status,
    detail: {
      // @ts-expect-error _data does not exists on `Response`
      data: fetchRes?._data,
      statusText: fetchRes?.statusText,
    },
  })
}

export class DetailedError extends Error {
  /**
   * Additional `message` that will be logged AND returned to client
   */
  public detail?: any
  /**
   * Additional `code` that will be logged AND returned to client
   */
  public code?: any
  /**
   * Additional value that will be logged AND NOT returned to client
   */
  public log?: any
  /**
   * Optionally set the status code to return, in a web server context
   */
  public statusCode?: any

  constructor(
    message: string,
    options: { detail?: any; code?: any; statusCode?: number; log?: any } = {}
  ) {
    super(message)
    this.log = options.log
    this.detail = options.detail
    this.code = options.code
    this.statusCode = options.statusCode
  }
}

const textTypes = new Set(['image/svg', 'application/xml', 'application/xhtml', 'application/html'])
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(?:;.+)?$/i

/**
 * The default `detectResponseType` function, this provides reasonable defaults for the correct parser based on Content-Type header.
 */
export function detectResponseType(response: Response): 'json' | 'text' | 'blob' {
  const _contentType = response.headers.get('content-type')

  if (!_contentType) {
    return 'json'
  }

  // Value might look like: `application/json; charset=utf-8`
  const contentType = _contentType.split(';').shift() || ''

  if (JSON_RE.test(contentType)) {
    return 'json'
  }

  if (textTypes.has(contentType) || contentType.startsWith('text/')) {
    return 'text'
  }

  return 'blob'
}
