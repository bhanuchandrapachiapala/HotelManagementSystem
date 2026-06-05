import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTimeClockEmployees,
  clockAction,
  getTodayRoster,
  getTimeEntries,
  getTimeClockAnalytics,
  getEmployeeSchedules,
  updateEmployeeSchedule,
  createScheduleOverride,
  deleteScheduleOverride,
  addTimeClockEmployee,
  updateTimeClockEmployee,
  editTimeEntry,
} from '../lib/api'
import type { CreateOverrideRequest } from '../types'

const STALE = 30000

export function useTimeClockEmployees(includeInactive = false) {
  return useQuery({
    queryKey: ['timeclock', 'employees', includeInactive],
    queryFn: () => getTimeClockEmployees(includeInactive),
    refetchInterval: 10000, // live status updates
  })
}

export function useTodayRoster() {
  return useQuery({
    queryKey: ['timeclock', 'today'],
    queryFn: getTodayRoster,
    refetchInterval: 30000,
  })
}

export function useTimeEntries(filters?: {
  employee_id?: number
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['timeclock', 'entries', filters ?? {}],
    queryFn: () => getTimeEntries(filters),
    staleTime: STALE,
  })
}

export function useTimeClockAnalytics(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['timeclock', 'analytics', dateFrom ?? '', dateTo ?? ''],
    queryFn: () => getTimeClockAnalytics(dateFrom, dateTo),
    staleTime: STALE,
  })
}

export function useEmployeeSchedules() {
  return useQuery({
    queryKey: ['timeclock', 'schedules'],
    queryFn: getEmployeeSchedules,
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
    mutationFn: (data: { name: string; shift_start: string; shift_end: string; buffer_minutes: number }) =>
      addTimeClockEmployee(data),
    onSuccess: invalidate,
  })
}

export function useUpdateEmployee() {
  const invalidate = useInvalidateTimeClock()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; is_active?: boolean } }) =>
      updateTimeClockEmployee(id, data),
    onSuccess: invalidate,
  })
}

export function useUpdateEmployeeSchedule() {
  const invalidate = useInvalidateTimeClock()
  return useMutation({
    mutationFn: ({
      employeeId,
      data,
    }: {
      employeeId: number
      data: { shift_start: string; shift_end: string; buffer_minutes: number }
    }) => updateEmployeeSchedule(employeeId, data),
    onSuccess: invalidate,
  })
}

export function useCreateScheduleOverride() {
  const invalidate = useInvalidateTimeClock()
  return useMutation({
    mutationFn: (data: CreateOverrideRequest) => createScheduleOverride(data),
    onSuccess: invalidate,
  })
}

export function useDeleteScheduleOverride() {
  const invalidate = useInvalidateTimeClock()
  return useMutation({
    mutationFn: (overrideId: number) => deleteScheduleOverride(overrideId),
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
