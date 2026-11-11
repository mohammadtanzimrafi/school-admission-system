import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './http'

function respondWith(status: number, body?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('request', () => {
  it('sends the student id header and JSON body', async () => {
    respondWith(201, { holdId: 'h_1' })

    await request('/classes/c_1/holds', { method: 'POST', studentId: '20152691234567890', body: { any: 'thing' } })

    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://localhost:8080/classes/c_1/holds')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({ 'X-Student-Id': '20152691234567890', 'Content-Type': 'application/json' })
    expect(init?.body).toBe('{"any":"thing"}')
  })

  it('turns a problem response into an ApiError carrying the backend code', async () => {
    respondWith(409, { status: 409, code: 'CLASS_FULL', detail: 'No seats are available.', holdId: null })

    const error = await request('/classes/c_1/holds', { method: 'POST' }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, code: 'CLASS_FULL', message: 'No seats are available.' })
  })

  it('reports an unreachable server as a NETWORK error instead of a raw failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await request('/classes').catch((e: unknown) => e)

    expect(error).toMatchObject({ status: 0, code: 'NETWORK', isConnectionProblem: true })
  })

  it('resolves with undefined for 204 No Content', async () => {
    respondWith(204)

    await expect(request('/holds/h_1', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})
