import type { app } from './generated/app'
import { hc } from '../../src/client'

const client = hc<typeof app>('/')
