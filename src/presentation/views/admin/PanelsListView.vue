<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getSupabase } from '@/infrastructure/supabaseClient'

type Row = {
  id: string
  code: string
  name: string
  is_published: boolean
  status: string
  city: string | null
}

const rows = ref<Row[]>([])
const err = ref<string | null>(null)

onMounted(async () => {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('panels')
    .select('id, code, name, is_published, status, city')
    .order('code')
  err.value = error?.message ?? null
  rows.value = (data ?? []) as Row[]
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-slate-900">Painéis</h1>
      <RouterLink
        to="/admin/panels/new"
        class="rounded-lg bg-[#e7bb0e] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#d4a90c]"
      >
        Novo painel
      </RouterLink>
    </div>
    <p v-if="err" class="mt-2 text-sm text-red-600">{{ err }}</p>
    <div class="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            <th class="px-4 py-2 font-medium">Código</th>
            <th class="px-4 py-2 font-medium">Nome</th>
            <th class="px-4 py-2 font-medium">Cidade</th>
            <th class="px-4 py-2 font-medium">Status</th>
            <th class="px-4 py-2 font-medium">Publicado</th>
            <th class="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="border-b border-slate-100">
            <td class="px-4 py-2 font-mono text-xs">{{ r.code }}</td>
            <td class="px-4 py-2">{{ r.name }}</td>
            <td class="px-4 py-2 text-slate-600">{{ r.city ?? '—' }}</td>
            <td class="px-4 py-2">{{ r.status }}</td>
            <td class="px-4 py-2">{{ r.is_published ? 'Sim' : 'Não' }}</td>
            <td class="px-4 py-2 text-right">
              <RouterLink
                :to="`/admin/panels/${r.id}/edit`"
                class="text-[#e7bb0e] hover:underline"
              >
                Editar
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
