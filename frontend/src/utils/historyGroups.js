/**
 * Format an ISO timestamp to local 12-hour time (e.g. "4:12 pm").
 * Returns an empty string if timestamp is invalid or missing.
 *
 * @param {string|null|undefined} iso
 * @returns {string}
 */
export function formatCompletionTime(iso) {
  if (!iso || typeof iso !== 'string') return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  try {
    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
      .format(date)
      .toLowerCase()
      .trim()
  } catch {
    return ''
  }
}

/**
 * Returns Monday 00:00:00.000 and Sunday 23:59:59.999 boundaries
 * for the week containing the given reference date.
 *
 * @param {Date|number} now
 * @returns {{ start: number, end: number }}
 */
export function getWeekBounds(now = Date.now()) {
  const ref = now instanceof Date ? new Date(now.getTime()) : new Date(now)
  const day = ref.getDay()
  // Sunday is 0; Monday is 1; distance to Monday:
  const diffToMonday = day === 0 ? 6 : day - 1

  const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - diffToMonday, 0, 0, 0, 0)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999)

  return { start: start.getTime(), end: end.getTime() }
}

/**
 * Returns 1st 00:00:00.000 and last day 23:59:59.999 boundaries
 * for the calendar month containing the given reference date.
 *
 * @param {Date|number} now
 * @returns {{ start: number, end: number }}
 */
export function getMonthBounds(now = Date.now()) {
  const ref = now instanceof Date ? new Date(now.getTime()) : new Date(now)
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999)

  return { start: start.getTime(), end: end.getTime() }
}

/**
 * Check if an ISO date string falls in the current Monday-Sunday week.
 *
 * @param {string|null|undefined} iso
 * @param {Date|number} [now=Date.now()]
 * @returns {boolean}
 */
export function isDateInThisWeek(iso, now = Date.now()) {
  if (!iso || typeof iso !== 'string') return false
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return false

  const { start, end } = getWeekBounds(now)
  return time >= start && time <= end
}

/**
 * Check if an ISO date string falls in the current calendar month.
 *
 * @param {string|null|undefined} iso
 * @param {Date|number} [now=Date.now()]
 * @returns {boolean}
 */
export function isDateInThisMonth(iso, now = Date.now()) {
  if (!iso || typeof iso !== 'string') return false
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return false

  const { start, end } = getMonthBounds(now)
  return time >= start && time <= end
}

/**
 * Filter an array of tasks by selected period ("week" or "month").
 *
 * @param {Array<object>} tasks
 * @param {'week'|'month'} [period='week']
 * @param {Date|number} [now=Date.now()]
 * @returns {Array<object>}
 */
export function filterByPeriod(tasks, period = 'week', now = Date.now()) {
  if (!Array.isArray(tasks)) return []

  if (period === 'month') {
    return tasks.filter((t) => isDateInThisMonth(t.resolved_at, now))
  }

  return tasks.filter((t) => isDateInThisWeek(t.resolved_at, now))
}

/**
 * Count the number of completed tasks belonging to this week.
 *
 * @param {Array<object>} tasks
 * @param {Date|number} [now=Date.now()]
 * @returns {number}
 */
export function countThisWeek(tasks, now = Date.now()) {
  if (!Array.isArray(tasks)) return 0
  return tasks.filter((t) => isDateInThisWeek(t.resolved_at, now)).length
}

/**
 * Get the header label for a task completion date (TODAY, YESTERDAY, or e.g. THURSDAY, 19 NOV).
 *
 * @param {string|null|undefined} iso
 * @param {Date|number} [now=Date.now()]
 * @returns {string}
 */
export function getDayLabel(iso, now = Date.now()) {
  if (!iso || typeof iso !== 'string') return 'EARLIER'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'EARLIER'

  const ref = now instanceof Date ? new Date(now.getTime()) : new Date(now)

  const isToday =
    date.getFullYear() === ref.getFullYear() &&
    date.getMonth() === ref.getMonth() &&
    date.getDate() === ref.getDate()

  if (isToday) return 'TODAY'

  const yesterday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()

  if (isYesterday) return 'YESTERDAY'

  try {
    const weekday = new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(date)
    const day = date.getDate()
    const month = new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date)
    return `${weekday.toUpperCase()}, ${day} ${month.toUpperCase()}`
  } catch {
    return 'EARLIER'
  }
}

/**
 * Group completed tasks by completion day, newest first.
 *
 * @param {Array<object>} tasks
 * @param {Date|number} [now=Date.now()]
 * @returns {Array<{ label: string, dateKey: string, items: Array<object> }>}
 */
export function groupCompletedByDay(tasks, now = Date.now()) {
  if (!Array.isArray(tasks) || tasks.length === 0) return []

  // Sort newest first by resolved_at
  const sorted = [...tasks].sort((a, b) => {
    const timeA = a.resolved_at ? new Date(a.resolved_at).getTime() : 0
    const timeB = b.resolved_at ? new Date(b.resolved_at).getTime() : 0
    return timeB - timeA
  })

  const groups = []
  const groupMap = new Map()

  for (const task of sorted) {
    let dateKey = 'earlier'
    if (task.resolved_at) {
      const d = new Date(task.resolved_at)
      if (!Number.isNaN(d.getTime())) {
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        dateKey = `${year}-${month}-${day}`
      }
    }

    if (!groupMap.has(dateKey)) {
      const label = getDayLabel(task.resolved_at, now)
      const group = { label, dateKey, items: [] }
      groupMap.set(dateKey, group)
      groups.push(group)
    }

    groupMap.get(dateKey).items.push(task)
  }

  return groups
}
