import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { DEFAULT_HOLD_SECONDS, REFRESH_INTERVAL } from '../config'
import { admissionApi } from './admission'
import { ApiError } from './http'
import type { CreateClassInput, Hold, HoldStatus } from './types'

const MY_HOLDS = 'my-holds'

const queryKeys = {
  classes: ['classes'] as const,
  hold: (holdId: string) => ['holds', holdId] as const,
  myHolds: (studentId: string) => [MY_HOLDS, studentId] as const,
  settings: ['settings'] as const,
}

/** Seat numbers and application lists all change when any application changes; settings do not. */
function refreshEverything(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.settings[0] })
}

/** All classes with seat numbers, re-fetched every few seconds while the tab is visible. */
export function useClasses() {
  return useQuery({
    queryKey: queryKeys.classes,
    queryFn: ({ signal }) => admissionApi.listClasses(signal),
    refetchInterval: REFRESH_INTERVAL.classes,
  })
}

/** Re-fetches every server value on screen, e.g. the moment a countdown reaches zero. */
export function useRefreshAll(): () => Promise<void> {
  const queryClient = useQueryClient()
  return useCallback(() => refreshEverything(queryClient), [queryClient])
}

/** One application. Polls while it can still change (HELD), then stops. Idle without an id. */
export function useHold(holdId: string | undefined) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: queryKeys.hold(holdId ?? ''),
    queryFn: ({ signal }) => admissionApi.getHold(holdId!, signal),
    enabled: Boolean(holdId),
    // Arriving from "my applications", the list already holds this application: show it
    // at once (and keep showing it if the server is briefly unreachable), then refresh.
    initialData: () =>
      queryClient
        .getQueriesData<Hold[]>({ queryKey: [MY_HOLDS] })
        .flatMap(([, holds]) => holds ?? [])
        .find((hold) => hold.holdId === holdId),
    initialDataUpdatedAt: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === undefined || status === 'HELD' ? REFRESH_INTERVAL.hold : false
    },
  })
}

/** Every application of the current student. Disabled until a student id is entered. */
export function useMyHolds(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.myHolds(studentId ?? ''),
    queryFn: ({ signal }) => admissionApi.listMyHolds(studentId!, signal),
    enabled: studentId !== null,
    refetchInterval: REFRESH_INTERVAL.myHolds,
  })
}

/** How long a seat stays held, from the backend; the default until it answers. Fetched once. */
export function useHoldSeconds(): number {
  const { data } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: ({ signal }) => admissionApi.getSettings(signal),
    staleTime: Infinity,
  })
  return data?.holdDurationSeconds ?? DEFAULT_HOLD_SECONDS
}

export function useCreateClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateClassInput) => admissionApi.createClass(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classes }),
  })
}

export function usePlaceHold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, studentId }: { classId: string; studentId: string }) =>
      admissionApi.placeHold(classId, studentId),
    onSuccess: (hold) => queryClient.setQueryData(queryKeys.hold(hold.holdId), hold),
    // Whether it worked or not, the seat numbers on screen are now out of date.
    onSettled: () => refreshEverything(queryClient),
  })
}

export function useConfirmHold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ holdId, studentId }: { holdId: string; studentId: string }) =>
      admissionApi.confirmHold(holdId, studentId),
    onSuccess: (hold) =>
      // The confirm response has no studentId; keep whatever the cached copy knew.
      queryClient.setQueryData<Hold>(queryKeys.hold(hold.holdId), (previous) => ({ ...previous, ...hold })),
    onSettled: () => refreshEverything(queryClient),
  })
}

export function useCancelHold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ holdId, studentId }: { holdId: string; studentId: string }) =>
      admissionApi.cancelHold(holdId, studentId),
    onSettled: () => refreshEverything(queryClient),
  })
}

/**
 * The status to show right now. The server is the authority, but between two polls a
 * HELD application whose time has run out is shown as EXPIRED straight away.
 */
export function effectiveStatus(hold: Pick<Hold, 'status' | 'deadline'>, now: number): HoldStatus {
  return hold.status === 'HELD' && now >= hold.deadline ? 'EXPIRED' : hold.status
}

/** Retry only when the server could not be reached; a 4xx answer will not change by asking again. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return error instanceof ApiError && error.isConnectionProblem && failureCount < 2
}
