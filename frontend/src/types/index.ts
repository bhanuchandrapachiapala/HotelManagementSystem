export interface TaskCompletion {
  id: number
  date: string
  task_id: string
  completed: boolean
  submitted_at: string
}

export interface TaskSummary {
  date: string
  completed_count: number
  total_tasks: number
  completion_rate: number
  task_ids: string[]
  submitted_at: string | null
}

export interface TaskRangeDay {
  date: string
  completed_count: number
  completion_rate: number
  task_ids: string[]
}

export interface TaskRangeResponse {
  start_date: string
  end_date: string
  days: TaskRangeDay[]
  summary: {
    total_days_with_data: number
    fully_completed_days: number
    partial_days: number
    empty_days: number
    overall_completion_rate: number
  }
}

export interface TaskAnalysisItem {
  task_id: string
  label: string
  completed_days: number
  missed_days: number
  completion_rate: number
  status: 'good' | 'fair' | 'low'
}

export interface TaskAnalysisResponse {
  month: string
  working_days: number
  tasks: TaskAnalysisItem[]
}

export interface TaskHistoryDay {
  date: string
  completed_count: number
  completion_rate: number
  label: string
}

export interface TaskHistoryResponse {
  history: TaskHistoryDay[]
}

export interface DinnerOrder {
  id: number
  room_number: string
  guest_initials: string
  entree: string
  sides: string[]
  dessert: string
  drink: string
  status: 'pending' | 'preparing' | 'delivered'
  notes: string | null
  submitted_at: string
  updated_at: string
}

export interface CreateOrderRequest {
  room_number: string
  guest_initials: string
  entree: string
  sides: string[]
  dessert: string
  drink: string
  notes?: string
}

export interface CreateOrderResponse {
  message: string
  order: DinnerOrder
}

export interface UpdateOrderResponse {
  message: string
  order: DinnerOrder
}

export interface SubmitResponse {
  message: string
  date: string
  completed_count: number
  total_tasks: number
  completion_rate: number
}

export interface OrderSummaryResponse {
  date: string
  total: number
  pending: number
  preparing: number
  delivered: number
  orders: DinnerOrder[]
}

export interface PopularItem {
  item: string
  count: number
  percentage: number
}

export interface OrderSummaryStats {
  date: string
  total: number
  pending: number
  preparing: number
  delivered: number
  popular_items: {
    entrees: PopularItem[]
    sides: PopularItem[]
    desserts: PopularItem[]
    drinks: PopularItem[]
  }
}

export interface OrderHistoryDay {
  date: string
  total: number
  label: string
}

export interface OrderHistoryResponse {
  history: OrderHistoryDay[]
}

export interface TaskDefinition {
  id: string
  label: string
  icon: string
}

export interface MenuSection {
  key: string
  label: string
  rule: string
  type: 'radio' | 'checkbox'
  max?: number
  items: MenuItem[]
}

export interface MenuItem {
  id: string
  label: string
  tag?: string
}

// ── Housekeeping ──────────────────────────────────────────────────────────────

export interface Housekeeper {
  id: number
  name: string
  is_active: boolean
  created_at: string
}

export interface RoomAssignment {
  id: number
  date: string
  room_number: string
  floor: number
  housekeeper_id: number
  housekeeper_name?: string
  status: 'pending' | 'in_progress' | 'done'
  assigned_at: string
  started_at: string | null
  completed_at: string | null
  updated_at: string
}

export interface HousekeeperProgress {
  housekeeper_id: number
  housekeeper_name: string
  assigned: number
  done: number
  pending: number
  in_progress: number
  completion_rate: number
  pace: 'fast' | 'on_track' | 'slow' | 'not_started'
  estimated_finish: string | null
}

export interface HousekeepingProgressResponse {
  date: string
  total_rooms: number
  total_assigned: number
  total_done: number
  total_pending: number
  overall_completion_rate: number
  housekeepers: HousekeeperProgress[]
}

export interface HousekeepingTimelineEntry {
  room_number: string
  floor: number
  housekeeper_name: string
  completed_at: string
  time_display: string
}

export interface AssignRoomsRequest {
  date: string
  housekeeper_id: number
  room_numbers: string[]
}

export interface TransferRoomsRequest {
  date: string
  from_housekeeper_id: number
  to_housekeeper_id: number
  room_numbers: string[]
}
