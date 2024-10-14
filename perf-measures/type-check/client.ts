import { hc } from '../../src/client'
import type { app } from './generated/app'

const client = hc<typeof app>('/')
