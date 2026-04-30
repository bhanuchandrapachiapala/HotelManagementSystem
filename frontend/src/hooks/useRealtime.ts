import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { DinnerOrder } from '../types'

export function useOrdersRealtime(
  onNewOrder: (order: DinnerOrder) => void,
  onOrderUpdated: (order: DinnerOrder) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel('dinner_orders_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dinner_orders' },
        (payload) => {
          onNewOrder(payload.new as DinnerOrder)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'dinner_orders' },
        (payload) => {
          onOrderUpdated(payload.new as DinnerOrder)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onNewOrder, onOrderUpdated])
}
