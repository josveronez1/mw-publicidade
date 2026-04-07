/** Abstração do gateway — implementação real na Fase 5 (Edge + MP). */

export type CreateSubscriptionResult =
  | { ok: true; subscriptionId: string; checkoutUrl: string | null }
  | { ok: false; error: string }

export type CancelSubscriptionResult =
  | { ok: true }
  | { ok: false; error: string }

export interface PaymentGatewayPort {
  createSubscriptionForContract(input: {
    contractId: string
    amountHintCents?: number
    /** full | pro_rata — admin choice */
    billingMode: 'full' | 'pro_rata'
  }): Promise<CreateSubscriptionResult>

  cancelSubscription(subscriptionId: string): Promise<CancelSubscriptionResult>

  syncContractStatus(contractId: string): Promise<{ status: string }>
}

export class PaymentGatewayStub implements PaymentGatewayPort {
  async createSubscriptionForContract(
    _input: Parameters<PaymentGatewayPort['createSubscriptionForContract']>[0],
  ): Promise<CreateSubscriptionResult> {
    return {
      ok: true,
      subscriptionId: `stub_${crypto.randomUUID()}`,
      checkoutUrl: null,
    }
  }

  async cancelSubscription(
    _subscriptionId: string,
  ): Promise<CancelSubscriptionResult> {
    return { ok: true }
  }

  async syncContractStatus(
    _contractId: string,
  ): Promise<{ status: string }> {
    return { status: 'unknown' }
  }
}
