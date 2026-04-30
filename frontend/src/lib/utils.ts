import { format, formatDistanceToNow, parseISO, isToday, isYesterday } from 'date-fns'

export function formatDate(date: Date): string {
  return format(date, 'EEEE, MMMM d, yyyy')
}

export function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d')
}

export function timeAgo(isoString: string): string {
  const date = parseISO(isoString)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return format(date, 'MMM d')
}

export function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getMonthRange(yearMonth: string): { start: string; end: string } {
  const [year, month] = yearMonth.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return {
    start: `${yearMonth}-01`,
    end: `${yearMonth}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
