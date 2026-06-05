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
  GroupContract,
  GroupActivityLog,
  GroupStats,
  CreateGroupContractRequest,
  UpdateGroupContractRequest,
  InventoryItem,
  InventoryLog,
  InventoryAlerts,
  InventorySummary,
  BulkUpdateEntry,
  Inspector,
  Inspection,
  InspectionIssue,
  OpenIssuesResponse,
  InspectionLogResponse,
  RoomStatusResponse,
  AnalyticsResponse,
  StartInspectionRequest,
  UpdateInspectionRequest as InspectionUpdateRequest,
  SubmitInspectionRequest,
  CreateIssueRequest,
  UpdateIssueStatusRequest,
  PhotoUploadUrlResponse,
  TimeClockEmployee,
  TimeClockEntry,
  TodayRosterResponse,
  TimeEntriesResponse,
  TimeClockAnalytics,
  SchedulesResponse,
  ScheduleOverride,
  CreateOverrideRequest,
} from '../types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    let message = 'API error'
    if (typeof err.detail === 'string') {
      message = err.detail
    } else if (Array.isArray(err.detail)) {
      message = err.detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(', ')
    } else if (err.message) {
      message = err.message
    }
    throw new Error(message)
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

// Front Desk Checklist
export function getFrontDeskToday(): Promise<TaskSummary> {
  return apiFetch('/api/frontdesk/today')
}

export function getFrontDeskForDate(date: string): Promise<TaskSummary> {
  return apiFetch(`/api/frontdesk/date/${date}`)
}

export function getFrontDeskRange(startDate: string, endDate: string): Promise<TaskRangeResponse> {
  return apiFetch(`/api/frontdesk/range?start_date=${startDate}&end_date=${endDate}`)
}

export function getFrontDeskAnalysis(month: string): Promise<TaskAnalysisResponse> {
  return apiFetch(`/api/frontdesk/analysis?month=${month}`)
}

export function getFrontDeskHistory(days = 7): Promise<TaskHistoryResponse> {
  return apiFetch(`/api/frontdesk/history?days=${days}`)
}

export function submitFrontDeskChecklist(date: string, taskIds: string[]): Promise<SubmitResponse> {
  return apiFetch('/api/frontdesk/submit', {
    method: 'POST',
    body: JSON.stringify({ date, task_ids: taskIds }),
  })
}

// Time Clock
export function getTimeClockEmployees(): Promise<{ employees: TimeClockEmployee[] }> {
  return apiFetch('/api/timeclock/employees')
}

export function clockAction(employeeId: number): Promise<{
  action: 'clocked_in' | 'clocked_out'
  entry: TimeClockEntry
  schedule?: { shift_start: string; shift_end: string }
  clock_in_status?: string
  total_hours?: number
  is_night_shift?: boolean
}> {
  return apiFetch('/api/timeclock/clock', {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId }),
  })
}

export function getTodayRoster(): Promise<TodayRosterResponse> {
  return apiFetch('/api/timeclock/today')
}

export function getTimeEntries(filters?: {
  employee_id?: number
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}): Promise<TimeEntriesResponse> {
  const params = new URLSearchParams()
  if (filters?.employee_id !== undefined) params.set('employee_id', String(filters.employee_id))
  if (filters?.date_from) params.set('date_from', filters.date_from)
  if (filters?.date_to) params.set('date_to', filters.date_to)
  if (filters?.limit !== undefined) params.set('limit', String(filters.limit))
  if (filters?.offset !== undefined) params.set('offset', String(filters.offset))
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/api/timeclock/entries${qs}`)
}

export function editTimeEntry(
  entryId: number,
  data: { clock_in_at?: string; clock_out_at?: string; notes?: string; edited_by: string },
): Promise<{ message: string; entry: TimeClockEntry }> {
  return apiFetch(`/api/timeclock/entries/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function getTimeClockAnalytics(dateFrom?: string, dateTo?: string): Promise<TimeClockAnalytics> {
  const params = new URLSearchParams()
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/api/timeclock/analytics${qs}`)
}

export function getEmployeeSchedules(): Promise<SchedulesResponse> {
  return apiFetch('/api/timeclock/schedules')
}

export function updateEmployeeSchedule(
  employeeId: number,
  data: { shift_start: string; shift_end: string; buffer_minutes: number },
): Promise<{ message: string; employee: TimeClockEmployee }> {
  return apiFetch(`/api/timeclock/employees/${employeeId}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function createScheduleOverride(
  data: CreateOverrideRequest,
): Promise<{ message: string; override: ScheduleOverride }> {
  return apiFetch('/api/timeclock/schedules/override', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function deleteScheduleOverride(overrideId: number): Promise<{ message: string }> {
  return apiFetch(`/api/timeclock/schedules/override/${overrideId}`, { method: 'DELETE' })
}

export function addTimeClockEmployee(data: {
  name: string
  shift_start: string
  shift_end: string
  buffer_minutes: number
}): Promise<{ message: string; employee: TimeClockEmployee }> {
  return apiFetch('/api/timeclock/employees', { method: 'POST', body: JSON.stringify(data) })
}

export function updateTimeClockEmployee(
  id: number,
  data: { name?: string; is_active?: boolean },
): Promise<{ message: string; employee: TimeClockEmployee }> {
  return apiFetch(`/api/timeclock/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
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

// Group Contracts
export function getGroupContracts(
  status?: string,
  upcomingOnly?: boolean,
): Promise<{ contracts: GroupContract[] }> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (upcomingOnly) params.set('upcoming_only', 'true')
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/api/groups${qs}`)
}

export function getGroupContract(id: number): Promise<{ contract: GroupContract }> {
  return apiFetch(`/api/groups/${id}`)
}

export function createGroupContract(
  data: CreateGroupContractRequest,
): Promise<{ message: string; contract: GroupContract }> {
  return apiFetch('/api/groups', { method: 'POST', body: JSON.stringify(data) })
}

export function updateGroupContract(
  id: number,
  data: UpdateGroupContractRequest,
): Promise<{ message: string; contract: GroupContract }> {
  return apiFetch(`/api/groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function addGroupNote(
  id: number,
  note: string,
): Promise<{ message: string; log: GroupActivityLog }> {
  return apiFetch(`/api/groups/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })
}

export function getGroupStats(): Promise<GroupStats> {
  return apiFetch('/api/groups/stats')
}

// Inventory
export function getInventoryItems(
  category?: string,
  vendor?: string,
  status?: string,
): Promise<{ items: InventoryItem[]; summary: InventorySummary }> {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (vendor) params.set('vendor', vendor)
  if (status) params.set('status', status)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/api/inventory/items${qs}`)
}

export function getInventoryAlerts(): Promise<InventoryAlerts> {
  return apiFetch('/api/inventory/alerts')
}

export function getInventoryHistory(): Promise<{ logs: InventoryLog[] }> {
  return apiFetch('/api/inventory/history')
}

export function getInventoryVendors(): Promise<{ vendors: string[] }> {
  return apiFetch('/api/inventory/vendors')
}

export function updateItemQuantity(
  itemId: number,
  data: { current_quantity: number; updated_by: string; change_type?: string; notes?: string },
): Promise<{ message: string; item: InventoryItem }> {
  return apiFetch(`/api/inventory/items/${itemId}/quantity`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function bulkUpdateInventory(
  updates: BulkUpdateEntry[],
  updatedBy: string,
): Promise<{ message: string; updated_count: number }> {
  return apiFetch('/api/inventory/items/bulk-update', {
    method: 'POST',
    body: JSON.stringify({ updates, updated_by: updatedBy }),
  })
}

export function markItemsOrdered(
  itemIds: number[],
  updatedBy: string,
): Promise<{ message: string }> {
  return apiFetch('/api/inventory/items/mark-ordered', {
    method: 'POST',
    body: JSON.stringify({ item_ids: itemIds, updated_by: updatedBy }),
  })
}

export function addInventoryItem(data: {
  name: string
  category: string
  vendor?: string
  unit?: string
  min_quantity?: number
  current_quantity?: number
  notes?: string
}): Promise<{ message: string; item: InventoryItem }> {
  return apiFetch('/api/inventory/items', { method: 'POST', body: JSON.stringify(data) })
}

export function updateInventoryItem(
  itemId: number,
  data: {
    name?: string
    min_quantity?: number
    vendor?: string
    unit?: string
    notes?: string
    is_active?: boolean
  },
): Promise<{ message: string; item: InventoryItem }> {
  return apiFetch(`/api/inventory/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// Inspections
export function getInspectors(): Promise<{ inspectors: Inspector[] }> {
  return apiFetch('/api/inspections/inspectors')
}

export function addInspector(name: string): Promise<{ message: string; inspector: Inspector }> {
  return apiFetch('/api/inspections/inspectors', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function deleteInspector(id: number): Promise<{ message: string; inspector: Inspector }> {
  return apiFetch(`/api/inspections/inspectors/${id}`, { method: 'DELETE' })
}

export function startInspection(
  data: StartInspectionRequest,
): Promise<{ message: string; inspection: Inspection }> {
  return apiFetch('/api/inspections/start', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateInspection(
  inspectionId: number,
  data: InspectionUpdateRequest,
): Promise<{ message: string; inspection: Inspection }> {
  return apiFetch(`/api/inspections/${inspectionId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function submitInspection(
  inspectionId: number,
  data: SubmitInspectionRequest,
): Promise<{ message: string; inspection: Inspection; duration_minutes?: number; issues_count: number }> {
  return apiFetch(`/api/inspections/${inspectionId}/submit`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function addInspectionIssue(
  inspectionId: number,
  data: CreateIssueRequest,
): Promise<{ message: string; issue: InspectionIssue }> {
  return apiFetch(`/api/inspections/${inspectionId}/issues`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateIssueStatus(
  issueId: number,
  data: UpdateIssueStatusRequest,
): Promise<{ message: string; issue: InspectionIssue }> {
  return apiFetch(`/api/inspections/issues/${issueId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function getOpenIssues(filters?: {
  severity?: string
  room_number?: string
  category?: string
}): Promise<OpenIssuesResponse> {
  const params = new URLSearchParams()
  if (filters?.severity) params.set('severity', filters.severity)
  if (filters?.room_number) params.set('room_number', filters.room_number)
  if (filters?.category) params.set('category', filters.category)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/api/inspections/issues/open${qs}`)
}

export function getInspectionLog(filters?: {
  limit?: number
  offset?: number
  room_number?: string
  inspector_id?: number
  date_from?: string
  date_to?: string
}): Promise<InspectionLogResponse> {
  const params = new URLSearchParams()
  if (filters?.limit !== undefined) params.set('limit', String(filters.limit))
  if (filters?.offset !== undefined) params.set('offset', String(filters.offset))
  if (filters?.room_number) params.set('room_number', filters.room_number)
  if (filters?.inspector_id !== undefined) params.set('inspector_id', String(filters.inspector_id))
  if (filters?.date_from) params.set('date_from', filters.date_from)
  if (filters?.date_to) params.set('date_to', filters.date_to)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/api/inspections/log${qs}`)
}

export function getInspection(id: number): Promise<{ inspection: Inspection }> {
  return apiFetch(`/api/inspections/${id}`)
}

export function getRoomInspectionStatus(): Promise<RoomStatusResponse> {
  return apiFetch('/api/inspections/room-status')
}

export function getInspectionAnalytics(days = 30): Promise<AnalyticsResponse> {
  return apiFetch(`/api/inspections/analytics?days=${days}`)
}

export function getPhotoUploadUrl(data: {
  inspection_id: number
  issue_id?: number
  photo_type: 'before' | 'after'
  file_extension?: string
}): Promise<PhotoUploadUrlResponse> {
  return apiFetch('/api/inspections/photos/upload-url', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
