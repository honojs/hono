import { h, Fragment} from 'preact'
import { renderToString } from 'preact-render-to-string'
import { buildPage } from './page'

export const render = () => renderToString(buildPage({ jsx: h, Fragment })() as any)