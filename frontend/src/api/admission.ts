import { request } from './http'
import type { ClassSeats, CreateClassInput, Hold, HoldDto, Settings } from './types'

/** Stamps a hold with its local deadline at the moment the response is received. */
export function toHold(dto: HoldDto, receivedAt: number = Date.now()): Hold {
  const remainingMs =
    typeof dto.remainingSeconds === 'number'
      ? dto.remainingSeconds * 1000
      : Date.parse(dto.expiresAt) - receivedAt // Fallback if the server omits the extra field.
  return { ...dto, deadline: receivedAt + Math.max(0, remainingMs) }
}

/** One function per endpoint of the API contract. */
export const admissionApi = {
  createClass: (input: CreateClassInput) => request<ClassSeats>('/classes', { method: 'POST', body: input }),

  listClasses: (signal?: AbortSignal) => request<ClassSeats[]>('/classes', { signal }),

  getClass: (classId: string, signal?: AbortSignal) =>
    request<ClassSeats>(`/classes/${encodeURIComponent(classId)}`, { signal }),

  placeHold: async (classId: string, studentId: string) =>
    toHold(await request<HoldDto>(`/classes/${encodeURIComponent(classId)}/holds`, { method: 'POST', studentId })),

  getHold: async (holdId: string, signal?: AbortSignal) =>
    toHold(await request<HoldDto>(`/holds/${encodeURIComponent(holdId)}`, { signal })),

  confirmHold: async (holdId: string, studentId: string) =>
    toHold(await request<HoldDto>(`/holds/${encodeURIComponent(holdId)}/confirm`, { method: 'POST', studentId })),

  cancelHold: (holdId: string, studentId: string) =>
    request<void>(`/holds/${encodeURIComponent(holdId)}`, { method: 'DELETE', studentId }),

  getSettings: (signal?: AbortSignal) => request<Settings>('/settings', { signal }),

  listMyHolds: async (studentId: string, signal?: AbortSignal) =>
    (await request<HoldDto[]>('/me/holds', { studentId, signal })).map((dto) => toHold(dto)),
}
