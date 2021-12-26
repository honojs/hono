const { splitPath, getPattern, getParamName } = require('./util')

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
  })

  it('getPattern', () => {
    let res = getPattern(':id')
    expect(res).toBe('(.+)')
    res = getPattern(':id{[0-9]+}')
    expect(res).toBe('([0-9]+)')
  })

  it('getParamName', () => {
    let res = getParamName(':id')
    expect(res).toBe('id')
    res = getParamName(':id{[0-9]+}')
    expect(res).toBe('id')
  })
})
