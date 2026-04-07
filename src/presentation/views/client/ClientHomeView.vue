<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getSupabase } from '@/infrastructure/supabaseClient'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const contracts = ref<
  {
    id: string
    contract_number: string
    status: string
    effective_end_date: string
    pdf_storage_path: string | null
  }[]
>([])
const charges = ref<{ contract_id: string; checkout_url: string | null; status: string }[]>([])
const err = ref<string | null>(null)

onMounted(async () => {
  const cid = auth.profile?.client_id
  if (!cid) return
  const sb = getSupabase()
  const { data, error } = await sb
    .from('contracts')
    .select('id, contract_number, status, effective_end_date, pdf_storage_path')
    .eq('client_id', cid)
    .order('created_at', { ascending: false })
  err.value = error?.message ?? null
  contracts.value = (data ?? []) as typeof contracts.value
  const ids = contracts.value.map((c) => c.id)
  if (ids.length) {
    const { data: ch } = await sb
      .from('gateway_charges')
      .select('contract_id, checkout_url, status')
      .in('contract_id', ids)
    charges.value = (ch ?? []) as typeof charges.value
  }
})

function chargeFor(contractId: string) {
  return charges.value.find((c) => c.contract_id === contractId)
}
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold text-slate-900">Meus contratos</h1>
    <p v-if="err" class="mt-2 text-sm text-red-600">{{ err }}</p>
    <ul v-else class="mt-4 space-y-3">
      <li
        v-for="c in contracts"
        :key="c.id"
        class="rounded-xl border border-slate-200 bg-white p-4 text-sm"
      >
        <p class="font-mono font-semibold">{{ c.contract_number }}</p>
        <p class="text-slate-600">Status: {{ c.status }} · até {{ c.effective_end_date }}</p>
        <p v-if="c.pdf_storage_path" class="mt-2 text-[#e7bb0e]">
          PDF disponível no painel (path: {{ c.pdf_storage_path }})
        </p>
        <div v-if="chargeFor(c.id)" class="mt-2">
          <p class="text-slate-600">Pagamento: {{ chargeFor(c.id)!.status }}</p>
          <a
            v-if="chargeFor(c.id)!.checkout_url"
            :href="chargeFor(c.id)!.checkout_url!"
            class="mt-1 inline-block text-sm font-medium text-[#e7bb0e] hover:underline"
          >
            Abrir link de pagamento
          </a>
        </div>
      </li>
    </ul>
  </div>
</template>
