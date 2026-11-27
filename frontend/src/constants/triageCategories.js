export const ADMIN_DEPARTMENT = 'Sanitation'

export const TRIAGE_CATEGORIES = [
  {
    category: 'Solid Waste & Garbage',
    department: 'Sanitation',
  },
  {
    category: 'Potholes & Road Damage',
    department: 'Public Works Department',
  },
  {
    category: 'Waterlogging & Drainage',
    department: 'Sanitation',
  },
  {
    category: 'Streetlight',
    department: 'Electrical Department',
  },
  {
    category: 'Illegal Encroachment',
    department: 'Encroachments Department',
  },
  {
    category: 'Stray Animals & Pest Control',
    department: 'Public Health & Veterinary',
  },
]

export const CATEGORY_NAMES = TRIAGE_CATEGORIES.map((c) => c.category)

/**
 * Returns the assigned department for a given grievance category name.
 *
 * @param {string} category - Category title
 * @returns {string|null} The department name or null if unknown
 */
export function getCategoryDepartment(category) {
  if (typeof category !== 'string') return null
  const match = TRIAGE_CATEGORIES.find((c) => c.category === category)
  return match ? match.department : null
}

/**
 * Checks whether choosing a given category moves the complaint out of the admin's department.
 *
 * @param {string} category - Selected category
 * @param {string} [adminDepartment=ADMIN_DEPARTMENT] - The active admin's department
 * @returns {boolean} True if category belongs to another department
 */
export function isTeamMove(category, adminDepartment = ADMIN_DEPARTMENT) {
  const dept = getCategoryDepartment(category)
  if (!dept) return false
  const adminDeptNorm = (adminDepartment || '').trim().toLowerCase()
  const categoryDeptNorm = dept.trim().toLowerCase()
  return adminDeptNorm !== categoryDeptNorm
}

/**
 * Returns the target department name if the category moves the complaint, otherwise null.
 *
 * @param {string} category - Selected category
 * @param {string} [adminDepartment=ADMIN_DEPARTMENT] - The active admin's department
 * @returns {string|null} Department name or null if within admin's team
 */
export function getMovedDepartment(category, adminDepartment = ADMIN_DEPARTMENT) {
  if (isTeamMove(category, adminDepartment)) {
    return getCategoryDepartment(category)
  }
  return null
}
