import { getMimeType, getExtension } from './mime'

const mime = {
  m3u8: 'application/vnd.apple.mpegurl',
  ts: 'video/mp2t',
}

describe('mime', () => {
  it('getMimeType', () => {
    expect(getMimeType('hello.txt')).toBe('text/plain; charset=utf-8')
    expect(getMimeType('hello.html')).toBe('text/html; charset=utf-8')
    expect(getMimeType('hello.json')).toBe('application/json; charset=utf-8')
    expect(getMimeType('favicon.ico')).toBe('image/x-icon')
    expect(getMimeType('good.morning.hello.gif')).toBe('image/gif')
    expect(getMimeType('goodmorninghellogif')).toBeUndefined()
    expect(getMimeType('indexjs.abcd')).toBeUndefined()
  })

  it('getMimeType with custom mime', () => {
    expect(getMimeType('morning-routine.m3u8', mime)).toBe('application/vnd.apple.mpegurl')
    expect(getMimeType('morning-routine1.ts', mime)).toBe('video/mp2t')
    expect(getMimeType('readme.txt', mime)).toBeUndefined()
  })

  it('getExtension', () => {
    expect(getExtension('audio/aac')).toBe('aac')
    expect(getExtension('video/x-msvideo')).toBe('avi')
    expect(getExtension('image/avif')).toBe('avif')
    expect(getExtension('text/css')).toBe('css')
    expect(getExtension('text/html')).toBe('htm')
    expect(getExtension('image/jpeg')).toBe('jpeg')
    expect(getExtension('text/javascript')).toBe('js')
    expect(getExtension('application/json')).toBe('json')
    expect(getExtension('audio/mpeg')).toBe('mp3')
    expect(getExtension('video/mp4')).toBe('mp4')
    expect(getExtension('application/pdf')).toBe('pdf')
    expect(getExtension('image/png')).toBe('png')
    expect(getExtension('application/zip')).toBe('zip')
    expect(getExtension('non/existent')).toBeUndefined()
  })
})
