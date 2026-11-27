import { describe, expect, it } from 'vitest'
import {
  ADMIN_DEPARTMENT,
  CATEGORY_NAMES,
  TRIAGE_CATEGORIES,
  getCategoryDepartment,
  getMovedDepartment,
  isTeamMove,
} from '../triageCategories'

describe('triageCategories constants and helpers', () => {
  it('defines exactly the 6 approved categories with correct departments', () => {
    expect(TRIAGE_CATEGORIES).toHaveLength(6)
    expect(CATEGORY_NAMES).toEqual([
      'Solid Waste & Garbage',
      'Potholes & Road Damage',
      'Waterlogging & Drainage',
      'Streetlight',
      'Illegal Encroachment',
      'Stray Animals & Pest Control',
    ])

    expect(getCategoryDepartment('Solid Waste & Garbage')).toBe('Sanitation')
    expect(getCategoryDepartment('Potholes & Road Damage')).toBe('Public Works Department')
    expect(getCategoryDepartment('Waterlogging & Drainage')).toBe('Sanitation')
    expect(getCategoryDepartment('Streetlight')).toBe('Electrical Department')
    expect(getCategoryDepartment('Illegal Encroachment')).toBe('Encroachments Department')
    expect(getCategoryDepartment('Stray Animals & Pest Control')).toBe(
      'Public Health & Veterinary',
    )
  })

  it('defaults admin department to Sanitation', () => {
    expect(ADMIN_DEPARTMENT).toBe('Sanitation')
  })

  it('getCategoryDepartment returns null for invalid or non-existent categories', () => {
    expect(getCategoryDepartment('')).toBeNull()
    expect(getCategoryDepartment(null)).toBeNull()
    expect(getCategoryDepartment('Unknown Category')).toBeNull()
  })

  describe('isTeamMove', () => {
    it('returns false for Sanitation categories under Sanitation admin', () => {
      expect(isTeamMove('Solid Waste & Garbage')).toBe(false)
      expect(isTeamMove('Waterlogging & Drainage')).toBe(false)
      expect(isTeamMove('Solid Waste & Garbage', 'Sanitation')).toBe(false)
      expect(isTeamMove('Waterlogging & Drainage', '  Sanitation  ')).toBe(false)
    })

    it('returns true for categories belonging to other departments', () => {
      expect(isTeamMove('Potholes & Road Damage')).toBe(true)
      expect(isTeamMove('Streetlight')).toBe(true)
      expect(isTeamMove('Illegal Encroachment')).toBe(true)
      expect(isTeamMove('Stray Animals & Pest Control')).toBe(true)
    })

    it('returns false for unknown categories', () => {
      expect(isTeamMove('Random Category')).toBe(false)
      expect(isTeamMove(null)).toBe(false)
    })
  })

  describe('getMovedDepartment', () => {
    it('returns null when category belongs to admin department', () => {
      expect(getMovedDepartment('Solid Waste & Garbage')).toBeNull()
      expect(getMovedDepartment('Waterlogging & Drainage')).toBeNull()
    })

    it('returns the destination department name when category moves team', () => {
      expect(getMovedDepartment('Potholes & Road Damage')).toBe('Public Works Department')
      expect(getMovedDepartment('Streetlight')).toBe('Electrical Department')
      expect(getMovedDepartment('Illegal Encroachment')).toBe('Encroachments Department')
      expect(getMovedDepartment('Stray Animals & Pest Control')).toBe('Public Health & Veterinary')
    })
  })
})
