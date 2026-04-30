import type {
  TaskSummary,
  TaskRangeResponse,
  TaskAnalysisResponse,
  TaskHistoryResponse,
  OrderSummaryResponse,
  OrderSummaryStats,
  OrderHistoryResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  SubmitResponse,
  UpdateOrderResponse,
  Housekeeper,
  RoomAssignment,
  HousekeepingProgressResponse,
  HousekeepingTimelineEntry,
  AssignRoomsRequest,
  TransferRoomsRequest,
} from '../types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'API error')
  }
  return res.json() as Promise<T>
}

// Tasks
export function getTodayTasks(): Promise<TaskSummary> {
  return apiFetch('/api/tasks/today')
}

export function getTasksForDate(date: string): Promise<TaskSummary> {
  return apiFetch(`/api/tasks/date/${date}`)
}

export function getTasksRange(startDate: string, endDate: string): Promise<TaskRangeResponse> {
  return apiFetch(`/api/tasks/range?start_date=${startDate}&end_date=${endDate}`)
}

export function getTaskAnalysis(month: string): Promise<TaskAnalysisResponse> {
  return apiFetch(`/api/tasks/analysis?month=${month}`)
}

export function getTaskHistory(days = 7): Promise<TaskHistoryResponse> {
  return apiFetch(`/api/tasks/history?days=${days}`)
}

export function submitChecklist(date: string, taskIds: string[]): Promise<SubmitResponse> {
  return apiFetch('/api/tasks/submit', {
    method: 'POST',
    body: JSON.stringify({ date, task_ids: taskIds }),
  })
}

// Orders
export function getTodayOrders(status?: string): Promise<OrderSummaryResponse> {
  const qs = status ? `?status=${status}` : ''
  return apiFetch(`/api/orders/today${qs}`)
}

export function createOrder(order: CreateOrderRequest): Promise<CreateOrderResponse> {
  return apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(order) })
}

export function updateOrderStatus(orderId: number, status: string): Promise<UpdateOrderResponse> {
  return apiFetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function getOrderSummary(): Promise<OrderSummaryStats> {
  return apiFetch('/api/orders/summary')
}

export function getOrderHistory(days = 7): Promise<OrderHistoryResponse> {
  return apiFetch(`/api/orders/history?days=${days}`)
}

// Housekeeping
export function getHousekeepers(includeInactive = false): Promise<{ housekeepers: Housekeeper[] }> {
  const qs = includeInactive ? '?include_inactive=true' : ''
  return apiFetch(`/api/housekeeping/housekeepers${qs}`)
}

export function addHousekeeper(name: string): Promise<{ message: string; housekeeper: Housekeeper }> {
  return apiFetch('/api/housekeeping/housekeepers', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function deleteHousekeeper(id: number): Promise<{ message: string; housekeeper: Housekeeper }> {
  return apiFetch(`/api/housekeeping/housekeepers/${id}`, { method: 'DELETE' })
}

export function restoreHousekeeper(id: number): Promise<{ message: string; housekeeper: Housekeeper }> {
  return apiFetch(`/api/housekeeping/housekeepers/${id}/restore`, { method: 'PATCH' })
}

export function getAssignmentDates(): Promise<{ dates: string[] }> {
  return apiFetch('/api/housekeeping/assignments/dates')
}

export function getAssignments(
  date: string,
  housekeeperId?: number,
): Promise<{ date: string; assignments: RoomAssignment[] }> {
  const qs = housekeeperId ? `?date=${date}&housekeeper_id=${housekeeperId}` : `?date=${date}`
  return apiFetch(`/api/housekeeping/assignments${qs}`)
}

export function assignRooms(data: AssignRoomsRequest): Promise<{ message: string; assigned_count: number }> {
  return apiFetch('/api/housekeeping/assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function transferRooms(data: TransferRoomsRequest): Promise<{ message: string; transferred_count: number }> {
  return apiFetch('/api/housekeeping/assignments/transfer', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateRoomStatus(
  assignmentId: number,
  status: string,
): Promise<{ message: string; assignment: RoomAssignment }> {
  return apiFetch(`/api/housekeeping/assignments/${assignmentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function getHousekeepingProgress(date: string): Promise<HousekeepingProgressResponse> {
  return apiFetch(`/api/housekeeping/progress?date=${date}`)
}

export function getHousekeepingTimeline(
  date: string,
): Promise<{ timeline: HousekeepingTimelineEntry[] }> {
  return apiFetch(`/api/housekeeping/timeline?date=${date}`)
}
