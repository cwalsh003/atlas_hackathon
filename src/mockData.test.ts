import { describe, expect, it } from 'vitest'
import { kpis, ordersPerYeti, workOrders, yetis } from './mockData'

describe('mockData', () => {
  it('has at least 12 work orders', () => {
    expect(workOrders.length).toBeGreaterThanOrEqual(12)
  })

  it('has exactly 5 distinct yetis, and every order is assigned to one of them', () => {
    expect(yetis.length).toBe(5)
    expect(new Set(yetis).size).toBe(5)
    for (const order of workOrders) {
      expect(yetis).toContain(order.yeti)
    }
  })

  it('covers all four work order statuses', () => {
    const statuses = new Set(workOrders.map((order) => order.status))
    expect(statuses).toEqual(
      new Set(['scheduled', 'plowing', 'done', 'buried']),
    )
  })

  it('derives kpis from workOrders counts', () => {
    expect(kpis.ordersToday).toBe(workOrders.length)
    expect(kpis.plowingNow).toBe(
      workOrders.filter((o) => o.status === 'plowing').length,
    )
    expect(kpis.done).toBe(workOrders.filter((o) => o.status === 'done').length)
    expect(kpis.buried).toBe(
      workOrders.filter((o) => o.status === 'buried').length,
    )
  })

  it('derives ordersPerYeti counts from workOrders', () => {
    for (const yeti of yetis) {
      const expected = workOrders.filter((o) => o.yeti === yeti).length
      const entry = ordersPerYeti.find((e) => e.yeti === yeti)
      expect(entry?.count).toBe(expected)
    }
  })
})
