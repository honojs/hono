import type { Handler } from '../../hono'
// Cannot use ajv, as Cloudflare Worker gives error: Code generation from strings disallowed for this context
import { Validator } from '@cfworker/json-schema';
import type { Schema } from '@cfworker/json-schema';

type ValidatorMiddleware = (schema: Schema) => Handler

export const validator: ValidatorMiddleware = (schema) => {
    const validator = new Validator(schema);

    return async (c, next) => {    
        try {
            const { valid, errors } = validator.validate({
                body: JSON.parse(await c.req.text()),
                headers: Object.fromEntries(c.req.headers.entries()),
                params: c.req.queries()
            });

            if(!valid){
                c.status(400)
                return c.json({
                    errors
                })
            }
    
            await next()
        } catch (error) {
            console.error(error)
            c.status(400)
            return c.json({
                message: error
            })
        }
    }
}