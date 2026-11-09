// FAKE development accounts for the mock API only.
// These credentials are used for local frontend testing before the real backend is connected.

export const MOCK_DEPARTMENTS = [
  { id: 'd1', name: 'Solid Waste Management' },
  { id: 'd2', name: 'Water Supply Board' },
  { id: 'd3', name: 'Roads & Public Works' },
  { id: 'd4', name: 'Vigilance & Grievance Cell' },
  { id: 'd5', name: 'Stormwater & Drainage' },
  { id: 'd6', name: 'Municipal Electrical Wing' },
  { id: 'd7', name: 'Public Health & Veterinary' },
  { id: 'd8', name: 'Town Planning & Encroachment' },
]

export const MOCK_ZONES = [
  { id: 'z1', name: 'Zone A' },
  { id: 'z2', name: 'Zone B' },
  { id: 'z3', name: 'Zone C' },
  { id: 'z4', name: 'Zone D' },
]

export const MOCK_ADMINS = [
  {
    id: '1',
    name: 'Demo Admin',
    username: 'admin',
    password: 'admin123',
  },
]

export const MOCK_WORKERS = [
  {
    id: '101',
    name: 'Ravi Patil',
    phone: '+919876543210',
    pin: '1234',
    is_active: true,
    department_id: 'd1',
    department: 'Solid Waste Management',
    zone_id: 'z1',
    zone: 'Zone A',
  },
  {
    id: '102',
    name: 'Anita Sharma',
    phone: '+919123456780',
    pin: '4321',
    is_active: true,
    department_id: 'd2',
    department: 'Water Supply Board',
    zone_id: 'z2',
    zone: 'Zone B',
  },
  {
    id: '103',
    name: 'Deactivated Worker',
    phone: '+919000000000',
    pin: '1234',
    is_active: false,
    department_id: 'd3',
    department: 'Roads & Public Works',
    zone_id: 'z3',
    zone: 'Zone C',
  },
  {
    id: '104',
    name: 'Empty Queue Worker',
    phone: '+919555500000',
    pin: '1111',
    is_active: true,
    department_id: 'd1',
    department: 'Solid Waste Management',
    zone_id: 'z2',
    zone: 'Zone B',
  },
  {
    id: '105',
    name: 'Error Demo Worker',
    phone: '+919666600000',
    pin: '2222',
    is_active: true,
    department_id: 'd5',
    department: 'Stormwater & Drainage',
    zone_id: 'z4',
    zone: 'Zone D',
  },
  {
    id: '106',
    name: 'Meera Joshi',
    phone: '+919811100001',
    pin: '5555',
    is_active: true,
    department_id: 'd6',
    department: 'Municipal Electrical Wing',
    zone_id: 'z1',
    zone: 'Zone A',
  },
  {
    id: '107',
    name: 'Imran Khan',
    phone: '+919811100002',
    pin: '6666',
    is_active: true,
    department_id: 'd7',
    department: 'Public Health & Veterinary',
    zone_id: 'z3',
    zone: 'Zone C',
  },
  {
    id: '108',
    name: 'Suresh Nair',
    phone: '+919811100003',
    pin: '7777',
    is_active: false,
    department_id: 'd8',
    department: 'Town Planning & Encroachment',
    zone_id: 'z4',
    zone: 'Zone D',
  },
]

const INITIAL_WORKERS = JSON.parse(JSON.stringify(MOCK_WORKERS))

export function resetMockWorkers() {
  MOCK_WORKERS.length = 0
  for (const worker of JSON.parse(JSON.stringify(INITIAL_WORKERS))) {
    MOCK_WORKERS.push(worker)
  }
}

export const MOCK_TASKS = [
  {
    id: 't1',
    worker_id: '101',
    tracking_code: 'GRV-2026-A7X3',
    category: 'Solid Waste & Garbage',
    description: 'Garbage dump near the market entrance',
    priority: 'high',
    status: 'Submitted',
    dueInHours: -3,
    latitude: 15.2993,
    longitude: 74.124,
    carry_forward_count: 0,
  },
  {
    id: 't2',
    worker_id: '101',
    tracking_code: 'GRV-2026-B2K9',
    category: 'Potholes & Road Damage',
    description: 'Large pothole on the main road',
    priority: 'critical',
    status: 'In-Progress',
    dueInHours: 5,
    latitude: 15.3012,
    longitude: 74.1255,
    carry_forward_count: 0,
  },
  {
    id: 't3',
    worker_id: '101',
    tracking_code: 'GRV-2026-C5M1',
    category: 'Waterlogging & Drainage',
    description: 'Water standing on the road after rain',
    priority: 'medium',
    status: 'Submitted',
    dueInHours: 20,
    latitude: 15.298,
    longitude: 74.122,
    carry_forward_count: 0,
  },
  {
    id: 't4',
    worker_id: '101',
    tracking_code: 'GRV-2026-D8P4',
    category: 'Streetlight & Power Outage',
    description: 'Streetlights not working in the lane',
    priority: 'low',
    status: 'Submitted',
    dueInHours: 30,
    latitude: 15.3025,
    longitude: 74.128,
    carry_forward_count: 0,
  },
  {
    id: 't5',
    worker_id: '101',
    tracking_code: 'GRV-2026-E1Q7',
    category: 'Illegal Encroachment',
    description: 'Hawkers blocking the footpath',
    priority: 'low',
    status: 'Submitted',
    dueInHours: -30,
    latitude: 15.297,
    longitude: 74.121,
    carry_forward_count: 0,
  },
  {
    id: 't6',
    worker_id: '102',
    tracking_code: 'GRV-2026-F3R2',
    category: 'Water Supply & Contamination',
    description: 'No water supply since morning',
    priority: 'critical',
    status: 'In-Progress',
    dueInHours: 2,
    latitude: 15.3005,
    longitude: 74.126,
    carry_forward_count: 0,
  },
  {
    id: 't7',
    worker_id: '102',
    tracking_code: 'GRV-2026-G9S6',
    category: 'Stray Animals & Pest Control',
    description: 'Aggressive stray dogs near the school gate',
    priority: 'medium',
    status: 'Submitted',
    dueInHours: 40,
    latitude: 15.303,
    longitude: 74.1295,
    carry_forward_count: 0,
  },
]

export const MOCK_RESOLUTIONS = []

const INITIAL_TASKS = JSON.parse(JSON.stringify(MOCK_TASKS))

export function resetMockTasks() {
  MOCK_TASKS.length = 0
  for (const task of JSON.parse(JSON.stringify(INITIAL_TASKS))) {
    MOCK_TASKS.push(task)
  }
  MOCK_RESOLUTIONS.length = 0
}
