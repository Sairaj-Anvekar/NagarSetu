const colorTokens = {
  primary: ['--ns-harbour', '#0B6E99'],
  teal: ['--ns-span', '#14A89A'],
  amber: ['--ns-warning-fg', '#8A5A00'],
  violet: ['--ns-chart-violet', '#7654A3'],
  rose: ['--ns-chart-rose', '#B54B70'],
  slate: ['--ns-slate', '#5B6B7A'],
  completed: ['--ns-success-fg', '#0F7A4A'],
  grid: ['--ns-line', '#E3E8EE'],
  surface: ['--ns-paper', '#FFFFFF'],
  area: ['--ns-info-bg', '#E4F1F8'],
}

export function getChartTheme() {
  const styles = typeof document !== 'undefined' && typeof getComputedStyle === 'function'
    ? getComputedStyle(document.documentElement)
    : null
  const colors = {}

  for (const [name, [token, fallback]] of Object.entries(colorTokens)) {
    const value = styles?.getPropertyValue(token).trim()
    colors[name] = value && !value.includes('var(') ? value : fallback
  }

  return {
    ...colors,
    palette: [
      colors.primary,
      colors.teal,
      colors.amber,
      colors.violet,
      colors.rose,
      colors.slate,
    ],
  }
}
