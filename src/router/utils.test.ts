import { UnsupportedPathError } from '../router'
import { checkOptionalParameter } from './utils'

describe('checkOptionalParameter', () => {
  it('Should throw an error for an optional parameter right after a wildcard', () => {
    for (const path of [
      '/files/*/:name?',
      '/x*/:id?',
      '/*/:id?',
      '/files/*/:a?/:b?',
      '/api/:a?/*/:b?',
    ]) {
      expect(() => checkOptionalParameter(path)).toThrowError(UnsupportedPathError)
    }
    expect(checkOptionalParameter('/x*y/:id?')).toEqual(['/x*y', '/x*y/:id'])
    expect(checkOptionalParameter('/files/*/sub/:name?')).toEqual([
      '/files/*/sub',
      '/files/*/sub/:name',
    ])
  })

  it('checkOptionalParameter', () => {
    expect(checkOptionalParameter('/api/animals/:type?')).toEqual([
      '/api/animals',
      '/api/animals/:type',
    ])
    expect(checkOptionalParameter('/api/animals/type?')).toBeNull()
    expect(checkOptionalParameter('/api/animals/:type')).toBeNull()
    expect(checkOptionalParameter('/api/animals')).toBeNull()
    expect(checkOptionalParameter('/api/:animals?/type')).toBeNull()
    expect(checkOptionalParameter('/api/animals/:type?/')).toBeNull()
    expect(checkOptionalParameter('/:optional?')).toEqual(['/', '/:optional'])
    expect(checkOptionalParameter('/v1/leaderboard/:version?/:platform?')).toEqual([
      '/v1/leaderboard',
      '/v1/leaderboard/:version',
      '/v1/leaderboard/:version/:platform',
    ])
    expect(checkOptionalParameter('/api/:version/animal/:type?')).toEqual([
      '/api/:version/animal',
      '/api/:version/animal/:type',
    ])
    expect(checkOptionalParameter('/api/:id{[0-9]?}?')).toEqual(['/api', '/api/:id{[0-9]?}'])
  })
})
