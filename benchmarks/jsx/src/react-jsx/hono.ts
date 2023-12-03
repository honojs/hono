import { buildPage } from './page-hono'

export const render = () => buildPage()().toString()