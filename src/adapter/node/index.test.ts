import { getConnInfo } from './conninfo'

describe('ConnInfo', () => {
  it('Should be re-exported', () => {
    expect(getConnInfo).toBeDefined()
  })
})
