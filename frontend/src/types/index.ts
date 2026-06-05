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

// ── Group Contracts ───────────────────────────────────────────────────────────

export interface GroupContract {
  id: number
  group_name: string
  contact_name: string
  contact_phone: string
  company_address?: string
  check_in_date: string
  check_out_date: string
  room_count: number
  room_type: string
  room_rate?: number
  triple_rate?: number
  quad_rate?: number
  deposit_by_date?: string
  cutoff_date?: string
  signed_by_date?: string
  status: 'inquiry' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled'
  deposit_paid: boolean
  special_notes?: string
  internal_notes?: string
  source: string
  days_until_checkin?: number
  cutoff_alert?: boolean
  activity_log?: GroupActivityLog[]
  created_at: string
  updated_at: string
}

export interface GroupActivityLog {
  id: number
  contract_id: number
  note: string
  created_at: string
}

export interface GroupStats {
  total_active: number
  total_completed: number
  total_cancelled: number
  upcoming_this_week: number
  cutoff_alerts: number
  by_status: Record<string, number>
  by_month: Array<{ month: string; count: number }>
}

export interface CreateGroupContractRequest {
  group_name: string
  contact_name: string
  contact_phone: string
  company_address?: string
  check_in_date: string
  check_out_date: string
  room_count: number
  room_type: string
  room_rate?: number
  triple_rate?: number
  quad_rate?: number
  deposit_by_date?: string
  cutoff_date?: string
  special_notes?: string
  source: string
}

export interface UpdateGroupContractRequest {
  status?: string
  deposit_paid?: boolean
  room_rate?: number
  triple_rate?: number
  quad_rate?: number
  deposit_by_date?: string
  cutoff_date?: string
  signed_by_date?: string
  internal_notes?: string
  special_notes?: string
  room_count?: number
  room_type?: string
}

export interface InventoryItem {
  id: number
  name: string
  category: string
  vendor: string
  unit: string
  min_quantity: number
  current_quantity: number
  suggested_order: number
  notes?: string
  is_active: boolean
  last_checked_at?: string
  last_checked_by?: string
  status?: 'critical' | 'low' | 'ok'
  icon?: string
  created_at: string
  updated_at: string
}

export interface InventoryLog {
  id: number
  item_id: number
  item_name?: string
  category?: string
  previous_qty: number
  new_qty: number
  change_type: string
  updated_by?: string
  notes?: string
  created_at: string
}

export interface InventoryAlerts {
  critical_count: number
  low_count: number
  by_vendor: Record<string, InventoryItem[]>
}

export interface InventorySummary {
  total: number
  critical: number
  low: number
  ok: number
}

export interface BulkUpdateEntry {
  item_id: number
  current_quantity: number
  updated_by: string
  change_type?: string
  notes?: string
}

// ── Inspections ───────────────────────────────────────────────────────────────

export interface Inspector {
  id: number
  name: string
  is_active: boolean
  created_at: string
}

export interface Inspection {
  id: number
  room_number: string
  floor: number
  inspector_id: number
  inspector_name?: string
  inspection_type: string
  overall_cleanliness?: number
  overall_condition?: string
  quick_checks: Record<string, boolean>
  general_notes?: string
  started_at: string
  submitted_at?: string
  duration_minutes?: number
  status: 'in_progress' | 'submitted' | 'voided'
  issues?: InspectionIssue[]
  issues_count?: number
  open_issues_count?: number
  created_at: string
}

export interface InspectionIssue {
  id: number
  inspection_id: number
  room_number: string
  category: string
  severity: 'urgent' | 'standard' | 'minor' | 'note'
  location_in_room?: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  resolved_by?: string
  resolution_notes?: string
  before_photo_url?: string
  after_photo_url?: string
  created_at: string
  work_started_at?: string
  resolved_at?: string
  closed_at?: string
  updated_at: string
  time_open_hours?: number
  sla_status?: 'within_sla' | 'at_risk' | 'breached' | 'no_sla'
}

export interface RoomInspectionStatus {
  room_number: string
  floor: number
  last_inspection_date?: string | null
  last_inspection_type?: string | null
  overall_condition?: string | null
  open_issues: number
  urgent_issues: number
  status: 'never_inspected' | 'clear' | 'minor_issues' | 'standard_issues' | 'urgent'
}

export interface OpenIssuesResponse {
  total: number
  urgent: number
  standard: number
  minor: number
  note: number
  issues: InspectionIssue[]
}

export interface InspectionLogResponse {
  total: number
  inspections: Inspection[]
}

export interface RoomStatusResponse {
  rooms: Record<string, RoomInspectionStatus>
}

export interface AnalyticsResponse {
  period_days: number
  total_inspections: number
  total_issues: number
  open_issues: number
  urgent_open: number
  avg_inspection_duration_minutes: number | null
  avg_resolution_hours_by_severity: Record<string, number | null>
  issues_by_category: Array<{
    category: string
    label: string
    emoji: string
    count: number
    percentage: number
  }>
  issues_by_severity: Array<{
    severity: string
    count: number
    resolved: number
    sla_met: number
  }>
  most_problematic_rooms: Array<{
    room_number: string
    floor: number
    total_issues: number
    open_issues: number
    inspection_count: number
    avg_issues_per_inspection: number
  }>
  inspector_stats: Array<{
    inspector_id: number
    inspector_name: string
    total_inspections: number
    avg_duration_minutes: number | null
    total_issues_found: number
    avg_issues_per_inspection: number
  }>
  sla_compliance: Record<string, { total: number; within_sla: number; compliance_rate: number }>
  monthly_trend: Array<{ month: string; inspections: number; issues: number }>
}

export interface StartInspectionRequest {
  room_number: string
  inspector_id: number
  inspection_type: string
}

export interface UpdateInspectionRequest {
  overall_cleanliness?: number
  overall_condition?: string
  quick_checks?: Record<string, boolean>
  general_notes?: string
}

export interface SubmitInspectionRequest {
  overall_cleanliness: number
  overall_condition: string
  quick_checks: Record<string, boolean>
  general_notes?: string
}

export interface CreateIssueRequest {
  inspection_id: number
  room_number: string
  category: string
  severity: string
  location_in_room?: string
  description: string
  before_photo_url?: string
}

export interface UpdateIssueStatusRequest {
  status: string
  resolved_by?: string
  resolution_notes?: string
  after_photo_url?: string
}

export interface PhotoUploadUrlResponse {
  upload_url: string | null
  token?: string | null
  public_url: string | null
  path: string
  bucket: string
}

// ── Time Clock (v2 — schedules, pay week, night shifts) ──
export type ClockStatus = 'early' | 'on_time' | 'late' | 'manual' | 'pending'

export interface TimeClockEmployee {
  id: number
  name: string
  is_active: boolean
  created_at: string
  shift_start?: string         // "09:00"
  shift_end?: string           // "16:00"
  buffer_minutes?: number
  is_clocked_in: boolean
  current_entry_id?: number
  clocked_in_at?: string
  hours_today: number
  clock_in_status?: string
}

export interface EmployeeSchedule {
  employee_id: number
  shift_start: string
  shift_end: string
  buffer_minutes: number
}

export interface ScheduleOverride {
  id: number
  employee_id?: number
  override_date: string
  shift_start: string
  shift_end: string
  buffer_minutes: number
  override_for_all: boolean
  note?: string
  created_at: string
}

export interface TimeClockEntry {
  id: number
  employee_id: number
  employee_name?: string
  shift_date: string
  clock_in_at: string
  clock_out_at?: string
  total_minutes?: number
  total_hours?: number
  clock_in_status: string
  clock_out_status: string
  notes?: string
  edited_by?: string
  created_at: string
  is_night_shift?: boolean
}

export interface TimeClockAnalytics {
  date_from: string
  date_to: string
  by_employee: Array<{
    employee_id: number
    employee_name: string
    days_worked: number
    total_hours: number
    avg_hours_per_day: number
    overtime_days: number
    pay_week_hours: number
    entries_by_date: Array<{ date: string; hours: number; clock_in_status: string; clock_out_status: string }>
  }>
  daily_totals: Array<{ date: string; label: string; total_hours: number; employee_count: number }>
  overtime_alerts: Array<{ employee_name: string; type: string; hours: number; overtime_hours: number }>
  pay_week_start: string
  pay_week_end: string
}

// ── Time Clock response/request envelopes ──
export interface ScheduleRow {
  employee_id: number
  name: string
  shift_start: string
  shift_end: string
  buffer_minutes: number
  today_override: ScheduleOverride | null
}

export interface SchedulesResponse {
  schedules: ScheduleRow[]
  overrides: ScheduleOverride[]
}

export interface TimeEntriesResponse {
  entries: TimeClockEntry[]
  total: number
  limit: number
  offset: number
}

export interface TodayRosterEmployee {
  id: number
  name: string
  is_clocked_in: boolean
  current_entry_id: number | null
  clocked_in_at: string | null
  hours_today: number
  entries: TimeClockEntry[]
}

export interface TodayRosterResponse {
  date: string
  currently_in: number
  total_entries_today: number
  employees: TodayRosterEmployee[]
}

export interface CreateOverrideRequest {
  employee_id?: number | null
  override_date: string
  shift_start: string
  shift_end: string
  buffer_minutes: number
  override_for_all: boolean
  note?: string
}
