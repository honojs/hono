// @ts-expect-error Runtime API
import Headers from 'headers'
// @ts-expect-error Runtime API
import { ReadableStream, WritableStream, AbortController, AbortSignal } from 'streams'
// @ts-expect-error Runtime API
import TextDecoder from 'text/decoder'
// @ts-expect-error Runtime API
import TextEncoder from 'text/encoder'
import URL from 'url'
import { AdapterRequest, AdapterResponse } from './utils/fetch'

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
