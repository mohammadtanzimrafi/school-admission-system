import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { REFRESH_INTERVAL } from '../config'
import { admissionApi } from './admission'
import { ApiError } from './http'
import type { CreateClassInput, Hold, HoldStatus } from './types'

export const queryKeys = {
  classes: ['classes'] as const,
  hold: (holdId: string) => ['holds', holdId] as const,
  myHolds: (studentId: string) => ['my-holds', studentId] as const,
}

/** Seat numbers and application lists all change when any application changes. */
function refreshEverything(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries()
}

/** All classes with seat numbers, re-fetched every few seconds while the tab is visible. */
export function useClasses() {
  return useQuery({
    queryKey: queryKeys.classes,
    queryFn: ({ signal }) => admissionApi.listClasses(signal),
    refetchInterval: REFRESH_INTERVAL.classes,
  })
}

/** One application. Polls while it can still change (HELD), then stops. */
export function useHold(holdId: string) {
  return useQuery({
    queryKey: queryKeys.hold(holdId),
    queryFn: ({ signal }) => admissionApi.getHold(holdId, signal),
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
