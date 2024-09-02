/**
 * @module
 * MIME utility.
 */

export const APPLICATION_JSON_UTF_8 = 'application/json; charset=UTF-8'

export const getMimeType = (
  filename: string,
  mimes: Record<string, string> = baseMimes
): string | undefined => {
  const regexp = /\.([a-zA-Z0-9]+?)$/
  const match = filename.match(regexp)
  if (!match) {
    return
  }
  let mimeType = mimes[match[1]]
  if ((mimeType && mimeType.startsWith('text')) || mimeType === 'application/json') {
    mimeType += '; charset=utf-8'
  }
  return mimeType
}

export const getExtension = (mimeType: string): string | undefined => {
  for (const ext in baseMimes) {
    if (baseMimes[ext] === mimeType) {
      return ext
    }
  }
}

export { baseMimes as mimes }

/**
 * Union types for BaseMime
 */
export type BaseMime =
  | 'audio/aac'
  | 'video/x-msvideo'
  | 'image/avif'
  | 'video/av1'
  | 'application/octet-stream'
  | 'image/bmp'
  | 'text/css'
  | 'text/csv'
  | 'application/vnd.ms-fontobject'
  | 'application/epub+zip'
  | 'image/gif'
  | 'application/gzip'
  | 'text/html'
  | 'image/x-icon'
  | 'text/calendar'
  | 'image/jpeg'
  | 'text/javascript'
  | 'application/json'
  | 'application/ld+json'
  | 'audio/x-midi'
  | 'audio/mpeg'
  | 'video/mp4'
  | 'video/mpeg'
  | 'audio/ogg'
  | 'video/ogg'
  | 'application/ogg'
  | 'audio/opus'
  | 'font/otf'
  | 'application/pdf'
  | 'image/png'
  | 'application/rtf'
  | 'image/svg+xml'
  | 'image/tiff'
  | 'video/mp2t'
  | 'font/ttf'
  | 'text/plain'
  | 'application/wasm'
  | 'video/webm'
  | 'audio/webm'
  | 'image/webp'
  | 'font/woff'
  | 'font/woff2'
  | 'application/xhtml+xml'
  | 'application/xml'
  | 'application/zip'
  | 'video/3gpp'
  | 'video/3gpp2'
  | 'model/gltf+json'
  | 'model/gltf-binary'

const baseMimes: Record<string, BaseMime> = {
  aac: 'audio/aac',
  avi: 'video/x-msvideo',
  avif: 'image/avif',
  av1: 'video/av1',
  bin: 'application/octet-stream',
  bmp: 'image/bmp',
  css: 'text/css',
  csv: 'text/csv',
  eot: 'application/vnd.ms-fontobject',
  epub: 'application/epub+zip',
  gif: 'image/gif',
  gz: 'application/gzip',
  htm: 'text/html',
  html: 'text/html',
  ico: 'image/x-icon',
  ics: 'text/calendar',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  js: 'text/javascript',
  json: 'application/json',
  jsonld: 'application/ld+json',
  map: 'application/json',
  mid: 'audio/x-midi',
  midi: 'audio/x-midi',
  mjs: 'text/javascript',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  mpeg: 'video/mpeg',
  oga: 'audio/ogg',
  ogv: 'video/ogg',
  ogx: 'application/ogg',
  opus: 'audio/opus',
  otf: 'font/otf',
  pdf: 'application/pdf',
  png: 'image/png',
  rtf: 'application/rtf',
  svg: 'image/svg+xml',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  ts: 'video/mp2t',
  ttf: 'font/ttf',
  txt: 'text/plain',
  wasm: 'application/wasm',
  webm: 'video/webm',
  weba: 'audio/webm',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  xhtml: 'application/xhtml+xml',
  xml: 'application/xml',
  zip: 'application/zip',
  '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2',
  gltf: 'model/gltf+json',
  glb: 'model/gltf-binary',
}
