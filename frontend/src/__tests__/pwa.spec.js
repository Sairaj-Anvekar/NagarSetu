import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('PWA configuration and assets', () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const rootDir = path.resolve(currentDir, '../../')
  const publicDir = path.resolve(rootDir, 'public')
  const manifestPath = path.resolve(publicDir, 'manifest.webmanifest')
  const swPath = path.resolve(publicDir, 'sw.js')
  const indexPath = path.resolve(rootDir, 'index.html')

  it('provides a valid manifest.webmanifest with required metadata and icons', () => {
    expect(fs.existsSync(manifestPath)).toBe(true)

    const rawManifest = fs.readFileSync(manifestPath, 'utf-8')
    let manifest
    expect(() => {
      manifest = JSON.parse(rawManifest)
    }).not.toThrow()

    expect(manifest.name).toBe('NagarSetu')
    expect(manifest.short_name).toBe('NagarSetu')
    expect(manifest.start_url).toBe('/worker')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBe('#0F2233')

    expect(Array.isArray(manifest.icons)).toBe(true)
    expect(manifest.icons.some((i) => i.sizes === '192x192')).toBe(true)
    expect(manifest.icons.some((i) => i.sizes === '512x512')).toBe(true)
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true)

    for (const icon of manifest.icons) {
      const relativePath = icon.src.replace(/^\//, '')
      const iconPath = path.resolve(publicDir, relativePath)
      expect(fs.existsSync(iconPath)).toBe(true)
      expect(fs.statSync(iconPath).size).toBeGreaterThan(0)
    }
  })

  it('includes required PWA link and meta tags in index.html', () => {
    expect(fs.existsSync(indexPath)).toBe(true)
    const indexHtml = fs.readFileSync(indexPath, 'utf-8')

    expect(indexHtml).toContain('<link rel="manifest" href="/manifest.webmanifest">')
    expect(indexHtml).toContain('<meta name="theme-color" content="#0F2233">')
    expect(indexHtml).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">')
  })

  it('provides an online-only service worker with a fetch listener and no cache API', () => {
    expect(fs.existsSync(swPath)).toBe(true)
    const swContent = fs.readFileSync(swPath, 'utf-8')

    expect(swContent).toMatch(/addEventListener\(\s*['"]fetch['"]/)
    expect(swContent).not.toContain('caches.')
  })
})

