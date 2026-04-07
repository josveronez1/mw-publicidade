<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getSupabase } from '@/infrastructure/supabaseClient'

const rows = ref<
  { id: string; name: string; slug: string; version: number; is_active: boolean }[]
>([])
const err = ref<string | null>(null)
const editing = ref({
  name: '',
  slug: '',
  body: 'Contrato entre {{empresa_mw}} e {{razao_social}}, CNPJ {{cnpj}}, valor {{valor_mensal}}.',
})

onMounted(load)

async function load() {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('contract_templates')
    .select('id, name, slug, version, is_active')
    .order('slug')
  err.value = error?.message ?? null
  rows.value = (data ?? []) as typeof rows.value
}

async function createTemplate() {
  const sb = getSupabase()
  const schema = { fields: [{ key: 'empresa_mw', label: 'Empresa MW', required: true }] }
  const { error } = await sb.from('contract_templates').insert({
    name: editing.value.name,
    slug: editing.value.slug,
    body: editing.value.body,
    body_format: 'markdown',
    placeholders_schema: schema,
  })
  if (error) err.value = error.message
  else {
    editing.value = {
      name: '',
      slug: '',
      body: 'Contrato entre {{empresa_mw}} e {{razao_social}}, CNPJ {{cnpj}}, valor {{valor_mensal}}.',
    }
    await load()
  }
}
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold text-slate-900">Modelos de contrato</h1>
    <p v-if="err" class="mt-2 text-sm text-red-600">{{ err }}</p>
    <div class="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <h2 class="text-sm font-semibold text-slate-800">Novo modelo</h2>
      <div class="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          v-model="editing.name"
          placeholder="Nome"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          v-model="editing.slug"
          placeholder="slug-unico"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>
      <textarea
        v-model="editing.body"
        rows="4"
        class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
      />
      <button
        type="button"
        class="mt-2 rounded-lg bg-[#e7bb0e] px-4 py-2 text-sm font-semibold text-slate-900"
        @click="createTemplate"
      >
        Salvar modelo
      </button>
    </div>
    <ul class="mt-6 space-y-2">
      <li
        v-for="r in rows"
        :key="r.id"
        class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
      >
        <span>{{ r.name }} <span class="text-slate-500">v{{ r.version }}</span></span>
        <span class="text-slate-500">{{ r.slug }}</span>
      </li>
    </ul>
  </div>
</template>
