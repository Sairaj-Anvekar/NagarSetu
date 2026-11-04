export function formatDateTime(iso) {
  if (!iso || typeof iso !== 'string') {
    return '—'
  }
  try {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) {
      return '—'
    }
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  } catch {
    return '—'
  }
}

export function getDueInfo(iso, now = Date.now()) {
  if (!iso || typeof iso !== 'string') {
    return { text: 'No deadline', overdue: false }
  }
  try {
    const target = new Date(iso)
    const targetMs = target.getTime()
    if (Number.isNaN(targetMs)) {
      return { text: 'No deadline', overdue: false }
    }
    const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
    if (Number.isNaN(nowMs)) {
      return { text: 'No deadline', overdue: false }
    }

    const diffMinutes = Math.round((targetMs - nowMs) / 60000)
    const overdue = diffMinutes < 0
    const absMinutes = Math.abs(diffMinutes)

    let amount
    if (absMinutes < 60) {
      amount = `${absMinutes} min`
    } else if (absMinutes < 48 * 60) {
      amount = `${Math.round(absMinutes / 60)} h`
    } else {
      amount = `${Math.round(absMinutes / (60 * 24))} d`
    }

    const text = overdue ? `${amount} overdue` : `${amount} left`
    return { text, overdue }
  } catch {
    return { text: 'No deadline', overdue: false }
  }
}

