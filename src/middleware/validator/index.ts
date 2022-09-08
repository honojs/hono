import { validatorMiddleware } from './middleware'
import { validator } from './validator'

const validation = validatorMiddleware<typeof validator>(validator)
export { validation }
