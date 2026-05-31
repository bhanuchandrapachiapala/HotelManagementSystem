import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTimeClockEmployees,
  clockAction,
  getTodayRoster,
  getTimeEntries,
  getTimeClockAnalytics,
  addTimeClockEmployee,
  updateTimeClockEmployee,
  editTimeEntry,
} from '../lib/api'
import type { Department } from '../types'

const STALE = 30000

export function useTimeClockEmployees(includeInactive = false) {
  return useQuery({
    queryKey: ['timeclock', 'employees', includeInactive],
    queryFn: () => getTimeClockEmployees(includeInactive),
    refetchInterval: 10000, // live timer / status updates
  })
}

export function useTodayRoster() {
  return useQuery({
    queryKey: ['timeclock', 'today'],
    queryFn: getTodayRoster,
    refetchInterval: 10000,
  })
}

export function useTimeEntries(filters?: {
  employee_id?: number
  date_from?: string
  date_to?: string
  department?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['timeclock', 'entries', filters ?? {}],
    queryFn: () => getTimeEntries(filters),
    staleTime: STALE,
  })
}

export function useTimeClockAnalytics(days = 7) {
  return useQuery({
    queryKey: ['timeclock', 'analytics', days],
    queryFn: () => getTimeClockAnalytics(days),
    staleTime: STALE,
  })
}

function useInvalidateTimeClock() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['timeclock'] })
}

export function useClockAction() {
  const invalidate = useInvalidateTimeClock()
  return useMutation({
    mutationFn: (employeeId: number) => clockAction(employeeId),
    onSuccess: invalidate,
  })
}

export function useAddEmployee() {
  const invalidate = useInvalidateTimeClock()
  return useMutation({
    mutationFn: (data: { name: string; department: Department }) => addTimeClockEmployee(data),
    onSuccess: invalidate,
  })
}

export function useUpdateEmployee() {
  const invalidate = useInvalidateTimeClock()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: { name?: string; department?: Department; is_active?: boolean }
    }) => updateTimeClockEmployee(id, data),
    onSuccess: invalidate,
  })
}

export function useEditEntry() {
  const invalidate = useInvalidateTimeClock()
  return useMutation({
    mutationFn: ({
      entryId,
      data,
    }: {
      entryId: number
      data: { clock_in_at?: string; clock_out_at?: string; notes?: string; edited_by: string }
    }) => editTimeEntry(entryId, data),
    onSuccess: invalidate,
  })
}
