import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInventoryItems,
  getInventoryAlerts,
  getInventoryHistory,
  updateItemQuantity,
  bulkUpdateInventory,
  markItemsOrdered,
  addInventoryItem,
  updateInventoryItem,
} from '../lib/api'
import type { BulkUpdateEntry } from '../types'

const STALE = 60000

export function useInventoryItems(category?: string, vendor?: string, status?: string) {
  return useQuery({
    queryKey: ['inventory-items', category ?? 'all', vendor ?? 'all', status ?? 'all'],
    queryFn: () => getInventoryItems(category, vendor, status),
    staleTime: STALE,
  })
}

export function useInventoryAlerts() {
  return useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: getInventoryAlerts,
    staleTime: STALE,
  })
}

export function useInventoryHistory() {
  return useQuery({
    queryKey: ['inventory-history'],
    queryFn: getInventoryHistory,
    staleTime: STALE,
  })
}

export function useUpdateQuantity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: number
      data: { current_quantity: number; updated_by: string; change_type?: string; notes?: string }
    }) => updateItemQuantity(itemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
      qc.invalidateQueries({ queryKey: ['inventory-alerts'] })
      qc.invalidateQueries({ queryKey: ['inventory-history'] })
    },
  })
}

export function useBulkUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ updates, updatedBy }: { updates: BulkUpdateEntry[]; updatedBy: string }) =>
      bulkUpdateInventory(updates, updatedBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
      qc.invalidateQueries({ queryKey: ['inventory-alerts'] })
      qc.invalidateQueries({ queryKey: ['inventory-history'] })
    },
  })
}

export function useMarkOrdered() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemIds, updatedBy }: { itemIds: number[]; updatedBy: string }) =>
      markItemsOrdered(itemIds, updatedBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
      qc.invalidateQueries({ queryKey: ['inventory-alerts'] })
      qc.invalidateQueries({ queryKey: ['inventory-history'] })
    },
  })
}

export function useAddInventoryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof addInventoryItem>[0]) => addInventoryItem(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
      qc.invalidateQueries({ queryKey: ['inventory-alerts'] })
    },
  })
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: number
      data: Parameters<typeof updateInventoryItem>[1]
    }) => updateInventoryItem(itemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
      qc.invalidateQueries({ queryKey: ['inventory-alerts'] })
    },
  })
}
