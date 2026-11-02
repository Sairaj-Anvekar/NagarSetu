export function getInitials(name) {
  if (typeof name !== 'string' || !name.trim()) return ''

  const words = name.trim().split(/\s+/)
  const first = Array.from(words[0])[0]
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : ''

  return (first + last).toUpperCase()
}
