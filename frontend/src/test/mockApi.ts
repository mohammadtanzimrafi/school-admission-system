import { vi } from 'vitest'
import type * as AdmissionModule from '../api/admission'

/**
 * The admission module with every endpoint replaced by a mock, keeping the real helpers
 * (toHold). Use in each test file:
 *
 *   vi.mock('../api/admission', async (original) =>
 *     (await import('../test/mockApi')).mockAdmissionModule(await original()))
 */
export function mockAdmissionModule(actual: typeof AdmissionModule): typeof AdmissionModule {
  const admissionApi = Object.fromEntries(Object.keys(actual.admissionApi).map((name) => [name, vi.fn()]))
  return { ...actual, admissionApi: admissionApi as unknown as typeof actual.admissionApi }
}
