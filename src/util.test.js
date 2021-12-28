const { splitPath, getPattern } = require('./util')

describe('Utility methods', () => {
  it('splitPath', () => {
    let ps = splitPath('/')
    expect(ps[0]).toBe('')
    ps = splitPath('/hello')
    expect(ps[0]).toBe('hello')
    ps = splitPath('*')
    expect(ps[0]).toBe('*')
    ps = splitPath('/wildcard-abc/*/wildcard-efg')
    expect(ps[0]).toBe('wildcard-abc')
    expect(ps[1]).toBe('*')
    expect(ps[2]).toBe('wildcard-efg')
    ps = splitPath('/map/:location/events')
    expect(ps[0]).toBe('map')
    expect(ps[1]).toBe(':location')
    expect(ps[2]).toBe('events')
  })

  it('getPattern', () => {
    let res = getPattern(':id')
    expect(res[0]).toBe('id')
    expect(res[1]).toBe('(.+)')
    res = getPattern(':id{[0-9]+}')
    expect(res[0]).toBe('id')
    expect(res[1]).toBe('([0-9]+)')
  })
})
