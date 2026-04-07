<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getSupabase } from '@/infrastructure/supabaseClient'
import { contractSemaphore } from '@/domain/semaphore'
import { PaymentGatewayStub } from '@/infrastructure/payment/PaymentGatewayPort'

type Row = {
  id: string
  contract_number: string
  status: string
  effective_start_date: string
  effective_end_date: string
  dispute_flag: boolean
  health_override: string | null
  manual_paid_at: string | null
  /** Supabase pode retornar objeto ou array conforme embed */
  clients: { legal_name: string } | { legal_name: string }[] | null
}

const rows = ref<Row[]>([])
const err = ref<string | null>(null)
const today = new Date().toISOString().slice(0, 10)

function paymentState(r: Row): 'ok' | 'pending' | 'overdue' | 'unknown' {
  if (r.manual_paid_at) return 'ok'
  if (r.status === 'active') return 'pending'
  return 'unknown'
}

function sem(r: Row) {
  return contractSemaphore({
    status: r.status,
    effective_end_date: r.effective_end_date,
    today,
    warnWithinDays: 30,
    payment: paymentState(r),
    health_override: (r.health_override as 'green' | 'yellow' | 'red' | null) ?? null,
    dispute_flag: r.dispute_flag,
  })
}

function clientName(r: Row) {
  const c = r.clients
  if (!c) return '—'
  if (Array.isArray(c)) return c[0]?.legal_name ?? '—'
  return c.legal_name
}

function semClass(s: string) {
  if (s === 'green') return 'bg-emerald-500'
  if (s === 'yellow') return 'bg-amber-400'
  return 'bg-red-500'
}

async function load() {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('contracts')
    .select('id, contract_number, status, effective_start_date, effective_end_date, dispute_flag, health_override, manual_paid_at, clients(legal_name)')
    .order('created_at', { ascending: false })
  err.value = error?.message ?? null
  rows.value = (data ?? []) as unknown as Row[]
}

onMounted(load)

const activating = ref<string | null>(null)

/** Ativa contrato + stub de assinatura (Fase 5 troca por gateway real). */
async function activateContract(id: string) {
  activating.value = id
  const sb = getSupabase()
  const gw = new PaymentGatewayStub()
  const res = await gw.createSubscriptionForContract({
    contractId: id,
    billingMode: 'full',
  })
  const subId = res.ok ? res.subscriptionId : null
  const { error } = await sb
    .from('contracts')
    .update({
      status: 'active',
      gateway_subscription_id: subId,
    })
    .eq('id', id)
  if (!error && res.ok) {
    await sb.from('gateway_charges').insert({
      contract_id: id,
      gateway: 'stub',
      external_id: subId,
      status: res.checkoutUrl ? 'pending' : 'ok',
      checkout_url: res.checkoutUrl,
    })
  }
  activating.value = null
  await load()
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-slate-900">Contratos</h1>
      <RouterLink
        to="/admin/contracts/new"
        class="rounded-lg bg-[#e7bb0e] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#d4a90c]"
      >
        Novo contrato
      </RouterLink>
    </div>
    <p v-if="err" class="mt-2 text-sm text-red-600">{{ err }}</p>
    <div class="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            <th class="px-4 py-2 font-medium">Semáforo</th>
            <th class="px-4 py-2 font-medium">Número</th>
            <th class="px-4 py-2 font-medium">Cliente</th>
            <th class="px-4 py-2 font-medium">Vigência</th>
            <th class="px-4 py-2 font-medium">Status</th>
            <th class="px-4 py-2 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="border-b border-slate-100">
            <td class="px-4 py-2">
              <span
                class="inline-block h-3 w-3 rounded-full"
                :class="semClass(sem(r))"
                :title="sem(r)"
              />
            </td>
            <td class="px-4 py-2 font-mono text-xs">{{ r.contract_number }}</td>
            <td class="px-4 py-2">{{ clientName(r) }}</td>
            <td class="px-4 py-2 text-slate-600">
              {{ r.effective_start_date }} → {{ r.effective_end_date }}
            </td>
            <td class="px-4 py-2">{{ r.status }}</td>
            <td class="px-4 py-2">
              <button
                v-if="r.status === 'pending_signature' || r.status === 'draft'"
                type="button"
                class="text-xs font-medium text-[#e7bb0e] hover:underline disabled:opacity-50"
                :disabled="activating === r.id"
                @click="activateContract(r.id)"
              >
                Ativar + cobrança (stub)
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
