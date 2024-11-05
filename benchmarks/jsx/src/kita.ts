import { jsx, Fragment } from '@kitajs/html/jsx-runtime'
import { buildPage } from './page'

export const render = () => buildPage({ jsx, Fragment })
