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
  }
]
