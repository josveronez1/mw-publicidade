<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getSupabase } from '@/infrastructure/supabaseClient'

type Row = { id: string; legal_name: string; trade_name: string | null; document_number: string; status: string }
const rows = ref<Row[]>([])
const err = ref<string | null>(null)

onMounted(async () => {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('clients')
    .select('id, legal_name, trade_name, document_number, status')
    .order('legal_name')
  err.value = error?.message ?? null
  rows.value = (data ?? []) as Row[]
})
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold text-slate-900">Clientes</h1>
    <p v-if="err" class="mt-2 text-sm text-red-600">{{ err }}</p>
    <div class="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            <th class="px-4 py-2 font-medium">Razão social</th>
            <th class="px-4 py-2 font-medium">CNPJ/Doc</th>
            <th class="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="border-b border-slate-100">
            <td class="px-4 py-2">{{ r.legal_name }}</td>
            <td class="px-4 py-2 font-mono text-xs">{{ r.document_number }}</td>
            <td class="px-4 py-2">{{ r.status }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
