import { expectTypeOf } from 'vitest'
import type { HonoJsonWebKey, SignatureKey } from './jws'
import { sign, verify } from './jwt'

describe('SignatureKey', () => {
  it('accepts Web Crypto keys and JWKs', async () => {
    const key = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, true, [
      'sign',
      'verify',
    ])
    const jwk = await crypto.subtle.exportKey('jwk', key)
    expectTypeOf(key).toExtend<SignatureKey>()
    expectTypeOf(jwk).toExtend<HonoJsonWebKey>()
    expectTypeOf('secret').toExtend<SignatureKey>()
    expectTypeOf({ kty: 'oct', k: 'c2VjcmV0', kid: 'key-1' }).toExtend<SignatureKey>()

    const token = await sign({ sub: '123' }, jwk, 'HS256')
    expect(await verify(token, key, 'HS256')).toEqual({ sub: '123' })
    expect(await verify(token, jwk, 'HS256')).toEqual({ sub: '123' })
  })

  it('rejects promises and unrelated values at compile time', () => {
    type Key = Awaited<ReturnType<typeof crypto.subtle.importKey>>
    expectTypeOf<Promise<Key>>().not.toExtend<SignatureKey>()
    expectTypeOf<Promise<HonoJsonWebKey>>().not.toExtend<SignatureKey>()
    expectTypeOf<number>().not.toExtend<SignatureKey>()
    expectTypeOf<{ unrelated: boolean }>().not.toExtend<SignatureKey>()
    expectTypeOf<Parameters<typeof sign>[1]>().toEqualTypeOf<SignatureKey>()
    expectTypeOf<Parameters<typeof verify>[1]>().toEqualTypeOf<SignatureKey>()
  })
})
