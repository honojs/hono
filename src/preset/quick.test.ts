import { Hono } from './quick'
import { getRouterName } from '../helper/dev'

describe('hono/quick preset', () => {
  it('Should have SmartRouter + LinearRouter', async () => {
    const app = new Hono()
    expect(getRouterName(app)).toBe('SmartRouter + LinearRouter')
  })
})
