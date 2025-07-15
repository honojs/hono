// @ts-expect-error Runtime API
import { ReadableStream, WritableStream, AbortController, AbortSignal } from 'streams'
import URL from 'url'
// @ts-expect-error Runtime API
import TextEncoder from 'text/encoder'
// @ts-expect-error Runtime API
import TextDecoder from 'text/decoder'
import { AdapterRequest, AdapterResponse } from './utils/fetch'
// @ts-expect-error Runtime API
import Headers from 'headers'

// @ts-expect-error Patch global objects
globalThis.URL ??= URL
globalThis.ReadableStream ??= ReadableStream
globalThis.WritableStream ??= WritableStream
globalThis.AbortController ??= AbortController
globalThis.AbortSignal ??= AbortSignal
globalThis.TextDecoder ??= TextDecoder
globalThis.TextEncoder ??= TextEncoder
globalThis.Request ??= AdapterRequest
// @ts-expect-error Patch global objects
globalThis.Response ??= AdapterResponse
globalThis.Headers ??= Headers
