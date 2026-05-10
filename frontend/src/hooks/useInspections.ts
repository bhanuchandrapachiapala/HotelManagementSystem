import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInspectors,
  addInspector,
  deleteInspector,
  startInspection,
  updateInspection,
  submitInspection,
  addInspectionIssue,
  updateIssueStatus,
  getOpenIssues,
  getInspectionLog,
  getInspection,
  getRoomInspectionStatus,
  getInspectionAnalytics,
  getPhotoUploadUrl,
} from '../lib/api'
import type {
  StartInspectionRequest,
  UpdateInspectionRequest,
  SubmitInspectionRequest,
  CreateIssueRequest,
  UpdateIssueStatusRequest,
} from '../types'

const FAST_STALE = 30000
const STALE = 60000

export function useInspectors() {
  return useQuery({
    queryKey: ['inspectors'],
    queryFn: getInspectors,
    staleTime: STALE,
  })
}

export function useOpenIssues(filters?: {
  severity?: string
  room_number?: string
  category?: string
}) {
  return useQuery({
    queryKey: ['open-issues', filters ?? {}],
    queryFn: () => getOpenIssues(filters),
    staleTime: FAST_STALE,
  })
}

export function useInspectionLog(filters?: {
  limit?: number
  offset?: number
  room_number?: string
  inspector_id?: number
  date_from?: string
  date_to?: string
}) {
  return useQuery({
    queryKey: ['inspection-log', filters ?? {}],
    queryFn: () => getInspectionLog(filters),
    staleTime: STALE,
  })
}

export function useInspection(id: number | null) {
  return useQuery({
    queryKey: ['inspection', id],
    queryFn: () => getInspection(id as number),
    staleTime: STALE,
    enabled: id != null,
  })
}

export function useRoomStatus() {
  return useQuery({
    queryKey: ['room-status'],
    queryFn: getRoomInspectionStatus,
    staleTime: STALE,
  })
}

export function useInspectionAnalytics(days = 30) {
  return useQuery({
    queryKey: ['inspection-analytics', days],
    queryFn: () => getInspectionAnalytics(days),
    staleTime: STALE,
  })
}

export function useAddInspector() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => addInspector(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspectors'] }),
  })
}

export function useDeleteInspector() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteInspector(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspectors'] }),
  })
}

export function useStartInspection() {
  return useMutation({
    mutationFn: (data: StartInspectionRequest) => startInspection(data),
  })
}

export function useUpdateInspection() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateInspectionRequest }) =>
      updateInspection(id, data),
  })
}

export function useSubmitInspection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SubmitInspectionRequest }) =>
      submitInspection(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspection-log'] })
      qc.invalidateQueries({ queryKey: ['room-status'] })
      qc.invalidateQueries({ queryKey: ['open-issues'] })
      qc.invalidateQueries({ queryKey: ['inspection-analytics'] })
    },
  })
}

export function useAddIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ inspectionId, data }: { inspectionId: number; data: CreateIssueRequest }) =>
      addInspectionIssue(inspectionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['open-issues'] })
      qc.invalidateQueries({ queryKey: ['inspection'] })
    },
  })
}

export function useUpdateIssueStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ issueId, data }: { issueId: number; data: UpdateIssueStatusRequest }) =>
      updateIssueStatus(issueId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['open-issues'] })
      qc.invalidateQueries({ queryKey: ['room-status'] })
      qc.invalidateQueries({ queryKey: ['inspection'] })
      qc.invalidateQueries({ queryKey: ['inspection-analytics'] })
    },
  })
}

export function useGetUploadUrl() {
  return useMutation({
    mutationFn: (data: {
      inspection_id: number
      issue_id?: number
      photo_type: 'before' | 'after'
      file_extension?: string
    }) => getPhotoUploadUrl(data),
  })
}
