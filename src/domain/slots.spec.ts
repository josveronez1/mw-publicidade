import { describe, expect, it } from 'vitest'
import {
  isContractActiveOnDate,
  totalSlotsUsedOnPanel,
  wouldExceedCapacity,
} from './slots'

describe('slots', () => {
  it('detects active contract on date', () => {
    expect(
      isContractActiveOnDate(
        {
          id: '1',
          status: 'active',
          effective_start_date: '2026-01-01',
          effective_end_date: '2026-12-31',
        },
        '2026-06-01',
      ),
    ).toBe(true)
    expect(
      isContractActiveOnDate(
        {
          id: '1',
          status: 'draft',
          effective_start_date: '2026-01-01',
          effective_end_date: '2026-12-31',
        },
        '2026-06-01',
      ),
    ).toBe(false)
  })

  it('sums slots for active contracts only', () => {
    const contracts = new Map([
      [
        'a',
        {
          id: 'a',
          status: 'active',
          effective_start_date: '2026-01-01',
          effective_end_date: '2026-12-31',
        },
      ],
      [
        'b',
        {
          id: 'b',
          status: 'draft',
          effective_start_date: '2026-01-01',
          effective_end_date: '2026-12-31',
        },
      ],
    ])
    const links = [
      { contract_id: 'a', panel_id: 'p1', slots_used: 2 },
      { contract_id: 'b', panel_id: 'p1', slots_used: 5 },
    ]
    expect(totalSlotsUsedOnPanel('p1', links, contracts, '2026-06-01')).toBe(2)
  })

  it('detects capacity exceed', () => {
    const contracts = new Map([
      [
        'a',
        {
          id: 'a',
          status: 'active',
          effective_start_date: '2026-01-01',
          effective_end_date: '2026-12-31',
        },
      ],
    ])
    const links = [{ contract_id: 'a', panel_id: 'p1', slots_used: 2 }]
    expect(
      wouldExceedCapacity({
        panelId: 'p1',
        panelCapacity: 3,
        links,
        contracts,
        asOfDate: '2026-06-01',
        additionalSlots: 2,
      }),
    ).toBe(true)
    expect(
      wouldExceedCapacity({
        panelId: 'p1',
        panelCapacity: 3,
        links,
        contracts,
        asOfDate: '2026-06-01',
        additionalSlots: 1,
      }),
    ).toBe(false)
  })
})
