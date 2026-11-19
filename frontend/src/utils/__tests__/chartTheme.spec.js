import { afterEach, describe, expect, it, vi } from 'vitest'
import { getChartTheme } from '../chartTheme'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getChartTheme', () => {
  it('reads and trims resolved token colors in palette order', () => {
    const values = {
      '--ns-harbour': ' #123456 ',
      '--ns-span': '#234567',
      '--ns-warning-fg': '#345678',
      '--ns-chart-violet': '#456789',
      '--ns-chart-rose': '#56789A',
      '--ns-slate': '#6789AB',
      '--ns-success-fg': '#789ABC',
    }
    const readStyles = vi.fn(() => ({
      getPropertyValue: (token) => values[token] ?? '',
    }))
    vi.stubGlobal('getComputedStyle', readStyles)
    const theme = getChartTheme()
    expect(readStyles).toHaveBeenCalledWith(document.documentElement)
    expect(theme.palette).toEqual([
      '#123456', '#234567', '#345678', '#456789', '#56789A', '#6789AB',
    ])
    expect(theme.completed).toBe('#789ABC')
  })

  it('uses safe fallback colors for missing or unresolved tokens', () => {
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (token) => token === '--ns-harbour' ? 'var(--missing)' : ' ',
    }))
    const theme = getChartTheme()
    expect(theme.palette).toEqual([
      '#0B6E99', '#14A89A', '#8A5A00', '#7654A3', '#B54B70', '#5B6B7A',
    ])
    expect(theme.grid).toBe('#E3E8EE')
    expect(theme.surface).toBe('#FFFFFF')
    expect(theme.area).toBe('#E4F1F8')
  })

  it('works when computed styles are unavailable', () => {
    vi.stubGlobal('getComputedStyle', undefined)
    expect(getChartTheme().primary).toBe('#0B6E99')
    expect(getChartTheme().completed).toBe('#0F7A4A')
  })
})
