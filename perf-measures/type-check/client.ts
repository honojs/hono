import { hc } from '../../src/client'
import type { app } from './generated/app'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const client = hc<typeof app>('/')
