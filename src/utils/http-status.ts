export type InfoStatusCode = 100 | 101 | 102 | 103
export type SuccessStatusCode = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226
export type DeprecatedStatusCode = 305 | 306
export type RedirectStatusCode = 300 | 301 | 302 | 303 | 304 | DeprecatedStatusCode | 307 | 308
export type ClientErrorStatusCode =
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 407
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 414
  | 415
  | 416
  | 417
  | 418
  | 421
  | 422
  | 423
  | 424
  | 425
  | 426
  | 428
  | 429
  | 431
  | 451
export type ServerErrorStatusCode = 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511
/**
 * `UnOfficalStatusCode` can be used to specify an informal status code.
 * @example
 *
 * ```ts
 * app.get('/', (c) => {
 *   return c.text("hono is cool", 666 as UnOfficalStatusCode)
 * })
 * ```
 */
export type UnOfficalStatusCode = -1

/**
 * If you want to use an unofficial status, use `UnOfficalStatusCode`.
 */
export type StatusCode =
  | InfoStatusCode
  | SuccessStatusCode
  | RedirectStatusCode
  | ClientErrorStatusCode
  | ServerErrorStatusCode
  | UnOfficalStatusCode

import type {StatusCode, UnOfficalStatusCode} from 'hono/utils/http-status'

export const HttpStatusPhrases: Record<Exclude<StatusCode, UnOfficalStatusCode>, string> = {
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',
  103: 'Early Hints',

  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',
  208: 'Already Reported',
  226: 'IM Used',

  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Moved Temporarily',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  306: 'Switch Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',

  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Request Entity Too Large',
  414: 'Request-URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Requested Range Not Satisfiable',
  417: 'Expectation Failed',
  418: 'I\'m a teapot',
  421: 'Misdirected Request',
  422: 'Unprocessable Entity',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',

  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  510: 'Not Extended',
  511: 'Network Authentication Required',
}

export const HttpStatus: Record<string, Exclude<StatusCode, UnOfficalStatusCode>> = {
  'CONTINUE': 100,
  'SWITCHING_PROTOCOLS': 101,
  'PROCESSING': 102,
  'EARLY_HINTS': 103,
  'OK': 200,
  'CREATED': 201,
  'ACCEPTED': 202,
  'NON_AUTHORITATIVE_INFORMATION': 203,
  'NO_CONTENT': 204,
  'RESET_CONTENT': 205,
  'PARTIAL_CONTENT': 206,
  'MULTI_STATUS': 207,
  'IM_USED': 226,

  'MULTIPLE_CHOICES': 300,
  'MOVED_PERMANENTLY': 301,
  'MOVED_TEMPORARILY': 302,
  'SEE_OTHER': 303,
  'NOT_MODIFIED': 304,
  'USE_PROXY': 305,
  'SWITCH_PROXY': 306,
  'TEMPORARY_REDIRECT': 307,
  'PERMANENT_REDIRECT': 308,

  'BAD_REQUEST': 400,
  'UNAUTHORIZED': 401,
  'PAYMENT_REQUIRED': 402,
  'FORBIDDEN': 403,
  'NOT_FOUND': 404,
  'METHOD_NOT_ALLOWED': 405,
  'NOT_ACCEPTABLE': 406,
  'PROXY_AUTHENTICATION_REQUIRED': 407,
  'REQUEST_TIMEOUT': 408,
  'CONFLICT': 409,
  'GONE': 410,
  'LENGTH_REQUIRED': 411,
  'PRECONDITION_FAILED': 412,
  'REQUEST_TOO_LONG': 413,
  'REQUEST_URI_TOO_LONG': 414,
  'UNSUPPORTED_MEDIA_TYPE': 415,
  'REQUESTED_RANGE_NOT_SATISFIABLE': 416,
  'EXPECTATION_FAILED': 417,
  'IM_A_TEAPOT': 418,
  'MISDIRECTED_REQUEST': 421,
  'UNPROCESSABLE_ENTITY': 422,
  'LOCKED': 423,
  'FAILED_DEPENDENCY': 424,
  'UPGRADE_REQUIRED': 426,
  'PRECONDITION_REQUIRED': 428,
  'TOO_EARLY': 425,
  'TOO_MANY_REQUESTS': 429,
  'REQUEST_HEADER_FIELDS_TOO_LARGE': 431,
  'UNAVAILABLE_FOR_LEGAL_REASONS': 451,

  'INTERNAL_SERVER_ERROR': 500,
  'NOT_IMPLEMENTED': 501,
  'BAD_GATEWAY': 502,
  'SERVICE_UNAVAILABLE': 503,
  'GATEWAY_TIMEOUT': 504,
  'HTTP_VERSION_NOT_SUPPORTED': 505,
  'VARIANT_ALSO_NEGOTIATES': 506,
  'INSUFFICIENT_STORAGE': 507,
  'LOOP_DETECTED': 508,
  'NOT_EXTENDED': 510,
  'NETWORK_AUTHENTICATION_REQUIRED': 511,
}

