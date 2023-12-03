import { jsx, Fragment} from '../../../src/jsx'
import { buildPage } from './page'

export const render = () => buildPage({ jsx, Fragment })().toString()