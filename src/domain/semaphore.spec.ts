import { describe, expect, it } from 'vitest'
import { contractSemaphore } from './semaphore'

describe('contractSemaphore', () => {
  it('override wins', () => {
    expect(
      contractSemaphore({
        status: 'active',
        effective_end_date: '2026-12-31',
        today: '2026-04-01',
        warnWithinDays: 30,
        payment: 'overdue',
        health_override: 'green',
        dispute_flag: false,
      }),
    ).toBe('green')
  })

  it('payment ok is green even near end', () => {
    expect(
      contractSemaphore({
        status: 'active',
        effective_end_date: '2026-04-10',
        today: '2026-04-01',
        warnWithinDays: 30,
        payment: 'ok',
        health_override: null,
        dispute_flag: false,
      }),
    ).toBe('green')
  })

  it('dispute is red', () => {
    expect(
      contractSemaphore({
        status: 'active',
        effective_end_date: '2026-12-31',
        today: '2026-04-01',
        warnWithinDays: 30,
        payment: 'ok',
        health_override: null,
        dispute_flag: true,
      }),
    ).toBe('red')
  })
})
