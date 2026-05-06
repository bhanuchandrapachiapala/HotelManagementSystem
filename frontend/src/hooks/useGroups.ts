import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getGroupContracts,
  getGroupContract,
  createGroupContract,
  updateGroupContract,
  addGroupNote,
  getGroupStats,
} from '../lib/api'
import type { CreateGroupContractRequest, UpdateGroupContractRequest } from '../types'

const STALE = 60000

export function useGroupContracts(status?: string, upcomingOnly?: boolean) {
  return useQuery({
    queryKey: ['groups', status ?? 'all', upcomingOnly ?? false],
    queryFn: () => getGroupContracts(status, upcomingOnly),
    staleTime: STALE,
  })
}

export function useGroupContract(id: number | null) {
  return useQuery({
    queryKey: ['groups', id],
    queryFn: () => getGroupContract(id!),
    staleTime: STALE,
    enabled: id !== null,
  })
}

export function useGroupStats() {
  return useQuery({
    queryKey: ['group-stats'],
    queryFn: getGroupStats,
    staleTime: STALE,
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGroupContractRequest) => createGroupContract(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      qc.invalidateQueries({ queryKey: ['group-stats'] })
    },
  })
}

export function useUpdateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateGroupContractRequest }) =>
      updateGroupContract(id, data),
    onSuccess: (_result, { id }) => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      qc.invalidateQueries({ queryKey: ['groups', id] })
      qc.invalidateQueries({ queryKey: ['group-stats'] })
    },
  })
}

export function useAddGroupNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => addGroupNote(id, note),
    onSuccess: (_result, { id }) => {
      qc.invalidateQueries({ queryKey: ['groups', id] })
    },
  })
}
