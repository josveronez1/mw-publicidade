<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getSupabase } from '@/infrastructure/supabaseClient'

type Row = {
  id: string
  name: string
  email: string
  company: string | null
  status: string
  created_at: string
}
const rows = ref<Row[]>([])
const err = ref<string | null>(null)

onMounted(async () => {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('quote_requests')
    .select('id, name, email, company, status, created_at')
    .order('created_at', { ascending: false })
  err.value = error?.message ?? null
  rows.value = (data ?? []) as Row[]
})
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold text-slate-900">Propostas recebidas</h1>
    <p v-if="err" class="mt-2 text-sm text-red-600">{{ err }}</p>
    <div class="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            <th class="px-4 py-2 font-medium">Data</th>
            <th class="px-4 py-2 font-medium">Nome</th>
            <th class="px-4 py-2 font-medium">E-mail</th>
            <th class="px-4 py-2 font-medium">Empresa</th>
            <th class="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="border-b border-slate-100">
            <td class="px-4 py-2 text-slate-600">{{ r.created_at?.slice(0, 10) }}</td>
            <td class="px-4 py-2">{{ r.name }}</td>
            <td class="px-4 py-2">{{ r.email }}</td>
            <td class="px-4 py-2">{{ r.company ?? '—' }}</td>
            <td class="px-4 py-2">{{ r.status }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
