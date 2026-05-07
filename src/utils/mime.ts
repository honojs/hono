/**
 * @module
 * MIME utility.
 */

export const getMimeType = (
  filename: string,
  mimes: Record<string, string> = baseMimes
): string | undefined => {
  const regexp = /\.([a-zA-Z0-9]+?)$/
  const match = filename.match(regexp)
  if (!match) {
    return
  }
  return mimes[match[1].toLowerCase()]
}

export const getExtension = (mimeType: string): string | undefined => {
  const baseType = mimeType.split(';', 1)[0].trim()
  for (const ext in baseMimes) {
    const stored = baseMimes[ext]
    if (stored === mimeType || stored.split(';', 1)[0].trim() === baseType) {
      return ext
    }
  }
}

export { baseMimes as mimes }

/**
 * Union types for BaseMime
 */
export type BaseMime = (typeof _baseMimes)[keyof typeof _baseMimes]

const _baseMimes = {
  aac: 'audio/aac',
  avi: 'video/x-msvideo',
  avif: 'image/avif',
  av1: 'video/av1',
  bin: 'application/octet-stream',
  bmp: 'image/bmp',
  css: 'text/css; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  eot: 'application/vnd.ms-fontobject',
  epub: 'application/epub+zip',
  gif: 'image/gif',
  gz: 'application/gzip',
  htm: 'text/html; charset=utf-8',
  html: 'text/html; charset=utf-8',
  ico: 'image/x-icon',
  ics: 'text/calendar; charset=utf-8',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json',
  jsonld: 'application/ld+json',
  map: 'application/json',
  mid: 'audio/x-midi',
  midi: 'audio/x-midi',
  mjs: 'text/javascript; charset=utf-8',
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
  svg: 'image/svg+xml; charset=utf-8',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  ts: 'video/mp2t',
  ttf: 'font/ttf',
  txt: 'text/plain; charset=utf-8',
  wasm: 'application/wasm',
  webm: 'video/webm',
  weba: 'audio/webm',
  webmanifest: 'application/manifest+json',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  xhtml: 'application/xhtml+xml; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  zip: 'application/zip',
  '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2',
  gltf: 'model/gltf+json',
  glb: 'model/gltf-binary',
} as const

const baseMimes: Record<string, BaseMime> = _baseMimes
