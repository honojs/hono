import { Hono } from './tiny'
import { getRouterName } from '../helper/dev'

describe('hono/tiny preset', () => {
  it('Should have PatternRouter', async () => {
    const app = new Hono()
    expect(getRouterName(app)).toBe('PatternRouter')
  })
})
