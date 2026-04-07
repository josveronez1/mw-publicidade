<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getSupabase } from '@/infrastructure/supabaseClient'

const counts = ref({ panels: 0, clients: 0, contracts: 0, quotes: 0 })

onMounted(async () => {
  const sb = getSupabase()
  const [p, c, ct, q] = await Promise.all([
    sb.from('panels').select('id', { count: 'exact', head: true }),
    sb.from('clients').select('id', { count: 'exact', head: true }),
    sb.from('contracts').select('id', { count: 'exact', head: true }),
    sb.from('quote_requests').select('id', { count: 'exact', head: true }),
  ])
  counts.value = {
    panels: p.count ?? 0,
    clients: c.count ?? 0,
    contracts: ct.count ?? 0,
    quotes: q.count ?? 0,
  }
})
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold text-slate-900">Painel</h1>
    <p class="mt-1 text-sm text-slate-600">Resumo rápido do sistema.</p>
    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <RouterLink
        to="/admin/panels"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#e7bb0e]/40"
      >
        <p class="text-2xl font-bold text-slate-900">{{ counts.panels }}</p>
        <p class="text-sm text-slate-600">Painéis</p>
      </RouterLink>
      <RouterLink
        to="/admin/clients"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#e7bb0e]/40"
      >
        <p class="text-2xl font-bold text-slate-900">{{ counts.clients }}</p>
        <p class="text-sm text-slate-600">Clientes</p>
      </RouterLink>
      <RouterLink
        to="/admin/contracts"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#e7bb0e]/40"
      >
        <p class="text-2xl font-bold text-slate-900">{{ counts.contracts }}</p>
        <p class="text-sm text-slate-600">Contratos</p>
      </RouterLink>
      <RouterLink
        to="/admin/quotes"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#e7bb0e]/40"
      >
        <p class="text-2xl font-bold text-slate-900">{{ counts.quotes }}</p>
        <p class="text-sm text-slate-600">Propostas</p>
      </RouterLink>
    </div>
  </div>
</template>
