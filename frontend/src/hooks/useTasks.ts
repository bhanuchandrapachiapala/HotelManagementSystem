import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTodayTasks,
  getTasksRange,
  getTaskAnalysis,
  getTaskHistory,
  submitChecklist,
} from '../lib/api'

export function useTodayTasks() {
  return useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: getTodayTasks,
    staleTime: 60000,
  })
}

export function useTasksRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['tasks', 'range', startDate, endDate],
    queryFn: () => getTasksRange(startDate, endDate),
    staleTime: 60000,
    enabled: !!startDate && !!endDate,
  })
}

export function useTaskAnalysis(month: string) {
  return useQuery({
    queryKey: ['tasks', 'analysis', month],
    queryFn: () => getTaskAnalysis(month),
    staleTime: 60000,
  })
}

export function useTaskHistory(days = 7) {
  return useQuery({
    queryKey: ['tasks', 'history', days],
    queryFn: () => getTaskHistory(days),
    staleTime: 60000,
  })
}

export function useSubmitChecklist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ date, taskIds }: { date: string; taskIds: string[] }) =>
      submitChecklist(date, taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
