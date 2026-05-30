import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getFrontDeskToday,
  getFrontDeskRange,
  getFrontDeskAnalysis,
  getFrontDeskHistory,
  submitFrontDeskChecklist,
} from '../lib/api'

export function useTodayFrontDesk() {
  return useQuery({
    queryKey: ['frontdesk', 'today'],
    queryFn: getFrontDeskToday,
    staleTime: 60000,
  })
}

export function useFrontDeskRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['frontdesk', 'range', startDate, endDate],
    queryFn: () => getFrontDeskRange(startDate, endDate),
    staleTime: 60000,
    enabled: !!startDate && !!endDate,
  })
}

export function useFrontDeskAnalysis(month: string) {
  return useQuery({
    queryKey: ['frontdesk', 'analysis', month],
    queryFn: () => getFrontDeskAnalysis(month),
    staleTime: 60000,
  })
}

export function useFrontDeskHistory(days = 7) {
  return useQuery({
    queryKey: ['frontdesk', 'history', days],
    queryFn: () => getFrontDeskHistory(days),
    staleTime: 60000,
  })
}

export function useSubmitFrontDeskChecklist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ date, taskIds }: { date: string; taskIds: string[] }) =>
      submitFrontDeskChecklist(date, taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frontdesk'] })
    },
  })
}
