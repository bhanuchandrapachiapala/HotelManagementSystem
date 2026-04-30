import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTodayOrders,
  createOrder,
  updateOrderStatus,
  getOrderSummary,
  getOrderHistory,
} from '../lib/api'
import type { CreateOrderRequest } from '../types'

export function useTodayOrders(status?: string) {
  return useQuery({
    queryKey: ['orders', 'today', status ?? 'all'],
    queryFn: () => getTodayOrders(status),
    staleTime: 60000,
    refetchInterval: 30000,
  })
}

export function useOrderSummary() {
  return useQuery({
    queryKey: ['orders', 'summary'],
    queryFn: getOrderSummary,
    staleTime: 60000,
    refetchInterval: 30000,
  })
}

export function useOrderHistory(days = 7) {
  return useQuery({
    queryKey: ['orders', 'history', days],
    queryFn: () => getOrderHistory(days),
    staleTime: 60000,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (order: CreateOrderRequest) => createOrder(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
