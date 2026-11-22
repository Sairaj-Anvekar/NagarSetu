import { getDueInfo } from './formatDate'

/**
 * Format an absolute-minutes value into a human-readable amount string.
 * Uses the same thresholds as getDueInfo but writes "days" in full instead
 * of the single character "d" that getDueInfo uses.
 *
 * @param {number} absMinutes
 * @returns {string}
 */
function formatAmount(absMinutes) {
  if (absMinutes < 60) return `${absMinutes} min`
  if (absMinutes < 48 * 60) return `${Math.round(absMinutes / 60)} h`
  return `${Math.round(absMinutes / (60 * 24))} days`
}

/**
 * Returns true if the task is currently overdue, using this priority:
 *   1. A Completed task is never overdue.
 *   2. If sla_deadline is present, derive the flag from it vs now.
 *   3. Fall back to the server-side is_overdue flag when no deadline exists.
 *
 * @param {object} task
 * @param {Date|number} [now=Date.now()]
 * @returns {boolean}
 */
export function isOverdue(task, now = Date.now()) {
  if (task?.status === 'Completed') return false
  if (task?.sla_deadline) {
    // Reuse getDueInfo for the Date-parsing and boundary logic.
    return getDueInfo(task.sla_deadline, now).overdue
  }
  return Boolean(task?.is_overdue)
}

/**
 * Returns a formatted time-left pill label for a task's SLA deadline, or null
 * when the task has no deadline.
 *
 * Label format:
 *   past  → "Overdue 3 h"   / "Overdue 2 days"
 *   future → "Due in 3 h"   / "Due in 2 days"
 *
 * Uses getDueInfo to validate the deadline and determine the overdue flag,
 * then computes the amount independently so the label reads "days" (not "d").
 *
 * @param {object} task
 * @param {Date|number} [now=Date.now()]
 * @returns {{ label: string, tone: 'overdue'|'due' }|null}
 */
export function timeLeftLabel(task, now = Date.now()) {
  if (!task?.sla_deadline) return null

  const dueInfo = getDueInfo(task.sla_deadline, now)
  if (dueInfo.text === 'No deadline') return null

  // getDueInfo already validated the ISO string; compute the amount ourselves
  // so we can write "days" in full instead of the "d" abbreviation it uses.
  const targetMs = new Date(task.sla_deadline).getTime()
  const nowMs = now instanceof Date ? now.getTime() : Number(now)
  const absMinutes = Math.abs(Math.round((targetMs - nowMs) / 60000))
  const amount = formatAmount(absMinutes)

  const label = dueInfo.overdue ? `Overdue ${amount}` : `Due in ${amount}`
  return { label, tone: dueInfo.overdue ? 'overdue' : 'due' }
}

/**
 * Counts tasks by filter category, relative to a given "now".
 * Expects an array of active (non-Completed) tasks; Completed items in the
 * array are still counted in `all` but are excluded from overdue.
 *
 * @param {object[]} tasks
 * @param {Date|number} [now=Date.now()]
 * @returns {{ all: number, submitted: number, inProgress: number, overdue: number }}
 */
export function countsByFilter(tasks, now = Date.now()) {
  let submitted = 0
  let inProgress = 0
  let overdueCount = 0

  for (const task of tasks) {
    if (task.status === 'Submitted') submitted++
    if (task.status === 'In-Progress') inProgress++
    if (isOverdue(task, now)) overdueCount++
  }

  return { all: tasks.length, submitted, inProgress, overdue: overdueCount }
}
