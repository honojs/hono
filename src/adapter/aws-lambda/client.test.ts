import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { Hono } from '../../hono'
import { hlc } from './client' // hlc をインポート
import { expect, beforeAll, afterAll, afterEach, describe, it } from 'vitest'

const app = new Hono()

app.post('/hash-check', async (c) => {
  const payload = await c.req.json()
  const sha256 = c.req.header('x-amz-content-sha256')
  return c.json({ receivedHash: sha256, payload }, 200)
})

app.put('/hash-check', async (c) => {
  const payload = await c.req.json()
  const sha256 = c.req.header('x-amz-content-sha256')
  return c.json({ receivedHash: sha256, payload }, 200)
})

// テスト用のモックサーバーを定義
const server = setupServer(
  http.post('http://localhost/hash-check', async ({ request }) => {
    const sha256 = request.headers.get('x-amz-content-sha256')
    const payload = await request.json()

    const calculateSHA256 = async (message: string): Promise<string> => {
      const msgBuffer = new TextEncoder().encode(message)
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
      const hashBytes = new Uint8Array(hashBuffer)
      let hashHex = ''
      for (let i = 0; i < hashBytes.length; i++) {
        const b = hashBytes[i]
        hashHex += b < 16 ? '0' + b.toString(16) : b.toString(16)
      }
      return hashHex
    }

    const expectedHash = await calculateSHA256(JSON.stringify(payload))

    if (sha256 === expectedHash) {
      return HttpResponse.json({ result: 'ok', receivedHash: sha256, payload })
    } else {
      return HttpResponse.json({ result: 'mismatch', receivedHash: sha256, expectedHash }, { status: 400 })
    }
  }),

  http.put('http://localhost/hash-check', async ({ request }) => {
    const sha256 = request.headers.get('x-amz-content-sha256')
    const payload = await request.json()

    const calculateSHA256 = async (message: string): Promise<string> => {
      const msgBuffer = new TextEncoder().encode(message)
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
      const hashBytes = new Uint8Array(hashBuffer)
      let hashHex = ''
      for (let i = 0; i < hashBytes.length; i++) {
        const b = hashBytes[i]
        hashHex += b < 16 ? '0' + b.toString(16) : b.toString(16)
      }
      return hashHex
    }

    const expectedHash = await calculateSHA256(JSON.stringify(payload))
    if (sha256 === expectedHash) {
      return HttpResponse.json({ result: 'ok', receivedHash: sha256, payload })
    } else {
      return HttpResponse.json({ result: 'mismatch', receivedHash: sha256, expectedHash }, { status: 400 })
    }
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('x-amz-content-sha256 header tests', () => {
  // type AppType を正しく定義
  type AppType = typeof app

  // hlc を使用してクライアントを作成
  const client = hlc<AppType>('http://localhost')

  it('Should send correct x-amz-content-sha256 header on POST', async () => {
    const payload = { name: 'Alice', message: 'Hello World' }
    const res = await client['hash-check'].$post({ json: payload })
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.result).toBe('ok')
    expect(data.payload).toEqual(payload)
    expect(data.receivedHash).toBeDefined()
    // ここで x-amz-content-sha256 が正しく計算されていることを確認
    const calculateSHA256 = async (message: string): Promise<string> => {
      const msgBuffer = new TextEncoder().encode(message)
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
      const hashBytes = new Uint8Array(hashBuffer)
      let hashHex = ''
      for (let i = 0; i < hashBytes.length; i++) {
        const b = hashBytes[i]
        hashHex += b < 16 ? '0' + b.toString(16) : b.toString(16)
      }
      return hashHex
    }
    const expectedHash = await calculateSHA256(JSON.stringify(payload))
    expect(data.receivedHash).toBe(expectedHash)
  })

  it('Should send correct x-amz-content-sha256 header on PUT', async () => {
    const payload = { user: 'Bob', comment: 'This is a test' }
    const res = await client['hash-check'].$put({ json: payload })
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.result).toBe('ok')
    expect(data.payload).toEqual(payload)
    expect(data.receivedHash).toBeDefined()
    const calculateSHA256 = async (message: string): Promise<string> => {
      const msgBuffer = new TextEncoder().encode(message)
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
      const hashBytes = new Uint8Array(hashBuffer)
      let hashHex = ''
      for (let i = 0; i < hashBytes.length; i++) {
        const b = hashBytes[i]
        hashHex += b < 16 ? '0' + b.toString(16) : b.toString(16)
      }
      return hashHex
    }
    const expectedHash = await calculateSHA256(JSON.stringify(payload))
    expect(data.receivedHash).toBe(expectedHash)
  })

  it('Should fail if no JSON is provided on POST (no hash)', async () => {
    // JSON未指定の場合はヘッダ付与されないはず
    // この場合は hash-check サーバー側でペイロードなし ⇒ 一致しないので 400 が返ることを確認
    const res = await client['hash-check'].$post()
    expect(res.ok).toBe(false)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.result).toBe('mismatch')
    expect(data.receivedHash).toBeUndefined()
    expect(data.expectedHash).toBeDefined()
  })

  it('Should fail if no JSON is provided on PUT (no hash)', async () => {
    const res = await client['hash-check'].$put()
    expect(res.ok).toBe(false)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.result).toBe('mismatch')
    expect(data.receivedHash).toBeUndefined()
    expect(data.expectedHash).toBeDefined()
  })
})
