import { API_BASE_URL } from '../config'
import { reportServerReachable } from '../lib/connection'

/** Any failed API call. `code` is what the UI switches on to pick a friendly message. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, unknown>

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  /** True when the server could not be reached at all (down, offline, timed out). */
  get isConnectionProblem(): boolean {
    return this.status === 0 || this.status === 503
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  studentId?: string | null
  signal?: AbortSignal
}

const REQUEST_TIMEOUT_MS = 15_000

/**
 * The one place that talks HTTP. Always resolves with parsed JSON (or undefined for 204)
 * and always rejects with an ApiError, so callers never see a raw fetch failure.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, studentId, signal } = options

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (studentId) headers['X-Student-Id'] = studentId

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
  } catch (cause) {
    if (signal?.aborted) throw cause // The caller cancelled; this is not a failure.
    reportServerReachable(false)
    throw timeout.aborted
      ? new ApiError(0, 'TIMEOUT', 'The server took too long to respond.')
      : new ApiError(0, 'NETWORK', 'Could not reach the server.')
  }

  reportServerReachable(response.status !== 503)

  if (response.status === 204) return undefined as T

  const payload = await readJson(response)
  if (!response.ok) {
    const problem = (payload ?? {}) as { code?: string; detail?: string; title?: string }
    throw new ApiError(
      response.status,
      problem.code ?? `HTTP_${response.status}`,
      problem.detail ?? problem.title ?? response.statusText,
      problem as Record<string, unknown>,
    )
  }

  return payload as T
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}
