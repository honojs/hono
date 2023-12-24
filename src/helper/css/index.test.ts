import { Hono } from '../..'
import { css, renderStyles } from './index'

describe('CSS Helper', () => {
  const app = new Hono()
  app.get('/', (c) => {
    const HeaderClass = css`
      background-color: blue;
      color: white;
      padding: 1rem;
    `
    return c.text(`<style>${renderStyles()}</style><h1 class=${HeaderClass}>Hello!</h1>`)
  })
  it('Should render CSS styles', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toBe(
      '<style>.css-4167396862 { background-color: blue; color: white; padding: 1rem; }</style><h1 class=css-4167396862>Hello!</h1>'
    )
  })
})
