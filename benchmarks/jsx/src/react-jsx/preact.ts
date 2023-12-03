import { renderToString } from 'preact-render-to-string'
import { buildPage } from './page-preact'

export const render = () => renderToString(buildPage()() as any)