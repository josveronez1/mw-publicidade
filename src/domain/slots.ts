/** Pure domain: occupied slots per panel for active contracts in range. */

export type ContractLike = {
  id: string
  status: string
  effective_start_date: string
  effective_end_date: string
}

export type ContractPanelLike = {
  id?: string
  contract_id: string
  panel_id: string
  slots_used: number
}

export function isContractActiveOnDate(
  c: ContractLike,
  date: string,
): boolean {
  if (c.status !== 'active') return false
  return date >= c.effective_start_date && date <= c.effective_end_date
}

export function totalSlotsUsedOnPanel(
  panelId: string,
  links: ContractPanelLike[],
  contracts: Map<string, ContractLike>,
  asOfDate: string,
): number {
  let sum = 0
  for (const cp of links) {
    if (cp.panel_id !== panelId) continue
    const c = contracts.get(cp.contract_id)
    if (!c || !isContractActiveOnDate(c, asOfDate)) continue
    sum += cp.slots_used
  }
  return sum
}

export function wouldExceedCapacity(args: {
  panelId: string
  panelCapacity: number
  links: ContractPanelLike[]
  contracts: Map<string, ContractLike>
  asOfDate: string
  additionalSlots: number
  ignoreLinkId?: string
}): boolean {
  const {
    panelId,
    panelCapacity,
    links,
    contracts,
    asOfDate,
    additionalSlots,
    ignoreLinkId,
  } = args
  const filtered = ignoreLinkId
    ? links.filter((l) => l.id == null || l.id !== ignoreLinkId)
    : links
  const used = totalSlotsUsedOnPanel(panelId, filtered, contracts, asOfDate)
  return used + additionalSlots > panelCapacity
}
