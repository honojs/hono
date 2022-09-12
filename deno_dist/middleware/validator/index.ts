import { validatorMiddleware } from './middleware.ts'
import { validator } from './validator.ts'

const validation = validatorMiddleware<typeof validator>(validator)
export { validation }
