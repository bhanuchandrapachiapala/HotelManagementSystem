import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/layout/PageWrapper'
import SectionCard from '../../components/ui/SectionCard'
import TabNav from '../../components/ui/TabNav'
import StatCard from '../../components/ui/StatCard'
import EmptyState from '../../components/ui/EmptyState'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import OrderCard from '../../components/dinner/OrderCard'
import PopularItemsChart from '../../components/dinner/PopularItemsChart'
import { useTodayOrders, useOrderSummary, useUpdateOrderStatus } from '../../hooks/useOrders'
import { useOrdersRealtime } from '../../hooks/useRealtime'
import type { DinnerOrder } from '../../types'

const TABS = ['Live Orders', 'Summary']
const FILTERS = ['All', 'Pending', 'Preparing', 'Delivered'] as const
type Filter = typeof FILTERS[number]

export default function DinnerAdminPage() {
  const [tab, setTab] = useState(TABS[0])
  const [filter, setFilter] = useState<Filter>('All')

  const statusParam = filter === 'All' ? undefined : filter.toLowerCase()
  const { data: ordersData, isLoading, refetch } = useTodayOrders(statusParam)
  const { data: summaryData, isLoading: loadingSummary } = useOrderSummary()
  const updateStatus = useUpdateOrderStatus()

  const onNewOrder = useCallback((order: DinnerOrder) => {
    toast(`🍽️ New order — Room ${order.room_number}`, { duration: 4000 })
    refetch()
  }, [refetch])

  const onOrderUpdated = useCallback(() => {
    refetch()
  }, [refetch])

  useOrdersRealtime(onNewOrder, onOrderUpdated)

  function handleStatusChange(id: number, status: string) {
    updateStatus.mutate({ orderId: id, status })
  }

  const orders = ordersData?.orders ?? []

  return (
    <PageWrapper>
      <TabNav tabs={TABS} activeTab={tab} onChange={setTab} />

      {tab === TABS[0] && (
        <SectionCard>
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="font-display text-base font-semibold">Tonight's Dinner Orders</h2>
              <p className="text-xs text-gray-400 mt-0.5">Auto-refreshes every 30 seconds</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => refetch()}
                className="text-xs font-semibold text-orange hover:text-orange-dark border border-orange/30 px-3 py-1.5 rounded-[8px] transition-colors"
              >
                Refresh
              </button>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-[8px] transition-colors ${
                    filter === f ? 'bg-orange text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <LoadingSpinner />
          ) : orders.length === 0 ? (
            <EmptyState icon="🍽️" message="No orders yet tonight" subtext="Orders will appear here when guests submit them." />
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {tab === TABS[1] && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard label="Total Orders" value={summaryData?.total ?? '—'} icon="🍽️" accentColor="orange" loading={loadingSummary} />
            <StatCard label="Pending" value={summaryData?.pending ?? '—'} icon="⏳" accentColor="yellow" loading={loadingSummary} />
            <StatCard label="Preparing" value={summaryData?.preparing ?? '—'} icon="👨‍🍳" accentColor="orange" loading={loadingSummary} />
            <StatCard label="Delivered" value={summaryData?.delivered ?? '—'} icon="✅" accentColor="green" loading={loadingSummary} />
          </div>

          <SectionCard>
            <h2 className="font-display text-base font-semibold mb-5">Most Popular Items Tonight</h2>
            {loadingSummary ? (
              <LoadingSpinner />
            ) : summaryData ? (
              <PopularItemsChart
                entrees={summaryData.popular_items.entrees}
                sides={summaryData.popular_items.sides}
                desserts={summaryData.popular_items.desserts}
                drinks={summaryData.popular_items.drinks}
              />
            ) : (
              <EmptyState message="No order data yet" />
            )}
          </SectionCard>
        </div>
      )}
    </PageWrapper>
  )
}
