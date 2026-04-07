/** Admin list semáforo por contrato (MVP rules from plan). */

export type PaymentState = 'ok' | 'pending' | 'overdue' | 'unknown'
export type Semaphore = 'green' | 'yellow' | 'red'

export type ContractSemaphoreInput = {
  status: string
  effective_end_date: string
  today: string
  /** Dias até vencer para alerta “quase” (só se pagamento não OK) */
  warnWithinDays: number
  payment: PaymentState
  /** manual override from DB */
  health_override: 'green' | 'yellow' | 'red' | null
  dispute_flag: boolean
}

export function contractSemaphore(input: ContractSemaphoreInput): Semaphore {
  if (input.health_override) return input.health_override
  if (input.dispute_flag) return 'red'
  if (input.status === 'cancelled' || input.status === 'expired') return 'red'
  if (input.today > input.effective_end_date) return 'red'

  if (input.payment === 'ok') return 'green'

  const end = new Date(input.effective_end_date)
  const now = new Date(input.today)
  const diffMs = end.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= input.warnWithinDays && diffDays >= 0) return 'yellow'

  if (input.payment === 'overdue') return 'red'
  if (input.payment === 'pending') return 'yellow'
  return 'unknown' === input.payment ? 'yellow' : 'green'
}
