import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import DashboardHero from '../DashboardHero.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/admin/complaints', component: { template: '<div>Complaints</div>' } },
    ],
  })
}

describe('DashboardHero', () => {
  it('renders greeting by hour of the day', () => {
    const morning = new Date(2026, 10, 23, 9, 30) // 9:30 AM
    const afternoon = new Date(2026, 10, 23, 14, 0) // 2:00 PM
    const evening = new Date(2026, 10, 23, 18, 45) // 6:45 PM

    const morningWrapper = mount(DashboardHero, {
      props: { userName: 'Ramesh Patil', now: morning },
      global: { plugins: [createTestRouter()] },
    })
    expect(morningWrapper.get('.dashboard-hero__greeting').text()).toBe('Good morning, Ramesh')

    const afternoonWrapper = mount(DashboardHero, {
      props: { userName: 'Ramesh Patil', now: afternoon },
      global: { plugins: [createTestRouter()] },
    })
    expect(afternoonWrapper.get('.dashboard-hero__greeting').text()).toBe('Good afternoon, Ramesh')

    const eveningWrapper = mount(DashboardHero, {
      props: { userName: 'Ramesh Patil', now: evening },
      global: { plugins: [createTestRouter()] },
    })
    expect(eveningWrapper.get('.dashboard-hero__greeting').text()).toBe('Good evening, Ramesh')
  })

  it('falls back to Admin when userName is missing or blank', () => {
    const wrapper = mount(DashboardHero, {
      props: { userName: '', now: new Date(2026, 10, 23, 10, 0) },
      global: { plugins: [createTestRouter()] },
    })
    expect(wrapper.get('.dashboard-hero__greeting').text()).toBe('Good morning, Admin')
  })

  it('renders department in eyebrow only when provided', async () => {
    const withDept = mount(DashboardHero, {
      props: { departmentName: 'Sanitation Department', now: new Date(2026, 10, 23, 10, 0) },
      global: { plugins: [createTestRouter()] },
    })
    expect(withDept.get('.dashboard-hero__eyebrow').text()).toBe(
      'SANITATION DEPARTMENT · SOLAPUR',
    )

    const withoutDept = mount(DashboardHero, {
      props: { departmentName: '', now: new Date(2026, 10, 23, 10, 0) },
      global: { plugins: [createTestRouter()] },
    })
    expect(withoutDept.get('.dashboard-hero__eyebrow').text()).toBe('SOLAPUR')
  })

  it('renders open count and overdue count with formatted numbers', () => {
    const wrapper = mount(DashboardHero, {
      props: {
        openCount: 42,
        overdueCount: 7,
        now: new Date(2026, 10, 23, 10, 0),
      },
      global: { plugins: [createTestRouter()] },
    })

    const metricValues = wrapper.findAll('.dashboard-hero__metric-value')
    expect(metricValues[0].text()).toBe('42')
    expect(metricValues[1].text()).toBe('7')
  })

  it('links "Review overdue" button to /admin/complaints?overdue=true', () => {
    const wrapper = mount(DashboardHero, {
      props: { now: new Date(2026, 10, 23, 10, 0) },
      global: { plugins: [createTestRouter()] },
    })

    const actionLink = wrapper.get('a.dashboard-hero__action-btn')
    expect(actionLink.text()).toContain('Review overdue')
    expect(actionLink.attributes('href')).toBe('/admin/complaints?overdue=true')
  })
})
