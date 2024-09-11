import { app } from './app'
import { hc } from '../src/client'

const client = hc<typeof app>('/')
