import { run, group, bench } from 'mitata'

bench('noop', () => {})

const request = new Request('http://localhost/about/me')

group('getPath', () => {
  bench('slice + indexOf', () => {
    const url = request.url
    const queryIndex = url.indexOf('?', 8)
    url.slice(url.indexOf('/', 8), queryIndex === -1 ? undefined : queryIndex)
  })

  bench('regexp', () => {
    const match = request.url.match(/^https?:\/\/[^/]+(\/[^?]*)/)
    match ? match[1] : ''
  })
})

run()
