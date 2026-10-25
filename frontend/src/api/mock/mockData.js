// FAKE development accounts for the mock API only.
// These credentials are used for local frontend testing before the real backend is connected.

export const MOCK_ADMINS = [
  {
    id: '1',
    name: 'Demo Admin',
    username: 'admin',
    password: 'admin123'
  }
]

export const MOCK_WORKERS = [
  {
    id: '101',
    name: 'Ravi Patil',
    phone: '+919876543210',
    pin: '1234',
    is_active: true
  },
  {
    id: '102',
    name: 'Anita Sharma',
    phone: '+919123456780',
    pin: '4321',
    is_active: true
  },
  {
    id: '103',
    name: 'Deactivated Worker',
    phone: '+919000000000',
    pin: '1234',
    is_active: false
  },
  {
    id: '104',
    name: 'Empty Queue Worker',
    phone: '+919555500000',
    pin: '1111',
    is_active: true
  },
  {
    id: '105',
    name: 'Error Demo Worker',
    phone: '+919666600000',
    pin: '2222',
    is_active: true
  }
]

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
    longitude: 74.124
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
    longitude: 74.1255
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
    longitude: 74.122
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
    longitude: 74.128
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
    longitude: 74.121
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
    longitude: 74.126
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
    longitude: 74.1295
  }
]

