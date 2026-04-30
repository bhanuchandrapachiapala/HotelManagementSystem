import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getHousekeepers,
  addHousekeeper,
  deleteHousekeeper,
  restoreHousekeeper,
  getAssignments,
  assignRooms,
  transferRooms,
  updateRoomStatus,
  getHousekeepingProgress,
  getHousekeepingTimeline,
} from '../lib/api'
import type { AssignRoomsRequest, TransferRoomsRequest } from '../types'

const STALE = 30000

export function useHousekeepers() {
  return useQuery({
    queryKey: ['housekeepers'],
    queryFn: () => getHousekeepers(false),
    staleTime: STALE,
  })
}

/** Returns only inactive (soft-deleted) housekeepers. Only fetches when `enabled` is true. */
export function useInactiveHousekeepers(enabled: boolean) {
  return useQuery({
    queryKey: ['housekeepers', 'all'],
    queryFn: () => getHousekeepers(true),
    staleTime: STALE,
    enabled,
    select: (data) => data.housekeepers.filter((h) => !h.is_active),
  })
}

export function useAssignments(date: string, housekeeperId?: number) {
  return useQuery({
    queryKey: housekeeperId
      ? ['assignments', date, housekeeperId]
      : ['assignments', date],
    queryFn: () => getAssignments(date, housekeeperId),
    staleTime: STALE,
    enabled: !!date,
  })
}

export function useHousekeepingProgress(date: string) {
  return useQuery({
    queryKey: ['hk-progress', date],
    queryFn: () => getHousekeepingProgress(date),
    staleTime: STALE,
    enabled: !!date,
  })
}

export function useHousekeepingTimeline(date: string) {
  return useQuery({
    queryKey: ['hk-timeline', date],
    queryFn: () => getHousekeepingTimeline(date),
    staleTime: STALE,
    enabled: !!date,
  })
}

export function useAddHousekeeper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => addHousekeeper(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['housekeepers'] }),
  })
}

export function useDeleteHousekeeper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteHousekeeper(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['housekeepers'] }),
  })
}

export function useRestoreHousekeeper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => restoreHousekeeper(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['housekeepers'] }),
  })
}

export function useAssignRooms() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AssignRoomsRequest) => assignRooms(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] })
      qc.invalidateQueries({ queryKey: ['hk-progress'] })
    },
  })
}

export function useTransferRooms() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TransferRoomsRequest) => transferRooms(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] })
      qc.invalidateQueries({ queryKey: ['hk-progress'] })
    },
  })
}

export function useUpdateRoomStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateRoomStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] })
      qc.invalidateQueries({ queryKey: ['hk-progress'] })
      qc.invalidateQueries({ queryKey: ['hk-timeline'] })
    },
  })
}
