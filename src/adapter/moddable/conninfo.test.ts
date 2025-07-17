import type { Context } from "../../context"
import { getConnInfo } from "./conninfo"

describe('getConnInfo', () => {
  it('Should throw an error if socket is not available', () => {
    const c: Context = {
      env: {}
    } as unknown as Context
    expect(() => getConnInfo(c)).toThrow(TypeError)
  })
  it('Should return empty remote address if REMOTE_IP is not available', () => {
    const c: Context = {
      env: {
        socket: {
          get: () => undefined
        }
      }
    } as unknown as Context
    expect(getConnInfo(c)).toEqual({
      remote: {}
    })
  })
  it('Should return remote address and transport type', () => {
    const c: Context = {
      env: {
        socket: {
          get: () => '1.1.1.1',
        },
      },
    } as unknown as Context
    expect(getConnInfo(c)).toEqual({
      remote: {
        address: '1.1.1.1',
        transport: 'tcp'
      }
    })
  })
})
