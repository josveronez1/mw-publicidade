<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { getSupabase } from '@/infrastructure/supabaseClient'

const router = useRouter()
const clients = ref<{ id: string; legal_name: string }[]>([])
const panels = ref<{ id: string; code: string; name: string; total_ad_slots: number }[]>([])
const clientId = ref('')
const start = ref(new Date().toISOString().slice(0, 10))
const end = ref(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10))
const panelSlots = ref<Record<string, number>>({})
const saving = ref(false)
const err = ref<string | null>(null)

onMounted(async () => {
  const sb = getSupabase()
  const [c, p] = await Promise.all([
    sb.from('clients').select('id, legal_name').order('legal_name'),
    sb.from('panels').select('id, code, name, total_ad_slots').order('code'),
  ])
  clients.value = (c.data ?? []) as typeof clients.value
  panels.value = (p.data ?? []) as typeof panels.value
  for (const x of panels.value) panelSlots.value[x.id] = 0
})

function togglePanel(id: string, on: boolean) {
  panelSlots.value[id] = on ? 1 : 0
}

async function submit() {
  saving.value = true
  err.value = null
  const sb = getSupabase()
  const { data: num, error: e1 } = await sb.rpc('next_contract_number')
  if (e1 || !num) {
    err.value = e1?.message ?? 'Falha ao gerar número'
    saving.value = false
    return
  }
  const { data: userData } = await sb.auth.getUser()
  const uid = userData.user?.id ?? null
  const { data: contract, error: e2 } = await sb
    .from('contracts')
    .insert({
      contract_number: num,
      client_id: clientId.value,
      status: 'draft',
      effective_start_date: start.value,
      effective_end_date: end.value,
      created_by: uid,
    })
    .select('id')
    .single()
  if (e2 || !contract) {
    err.value = e2?.message ?? 'Erro ao criar contrato'
    saving.value = false
    return
  }
  for (const p of panels.value) {
    const n = panelSlots.value[p.id] ?? 0
    if (n > 0) {
      const { error: e3 } = await sb.from('contract_panels').insert({
        contract_id: contract.id,
        panel_id: p.id,
        slots_used: n,
      })
      if (e3) {
        err.value = e3.message
        saving.value = false
        return
      }
    }
  }
  saving.value = false
  await router.push('/admin/contracts')
}
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold text-slate-900">Novo contrato</h1>
    <p v-if="err" class="mt-2 text-sm text-red-600">{{ err }}</p>
    <form class="mt-6 max-w-2xl space-y-4" @submit.prevent="submit">
      <label class="block text-xs font-medium text-slate-600">
        Cliente
        <select
          v-model="clientId"
          required
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option disabled value="">Selecione…</option>
          <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.legal_name }}</option>
        </select>
      </label>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block text-xs font-medium text-slate-600">
          Início vigência
          <input v-model="start" type="date" required class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label class="block text-xs font-medium text-slate-600">
          Fim vigência
          <input v-model="end" type="date" required class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </div>
      <div>
        <p class="text-xs font-medium text-slate-600">Painéis e vagas</p>
        <ul class="mt-2 space-y-2 rounded-lg border border-slate-200 p-3">
          <li v-for="p in panels" :key="p.id" class="flex flex-wrap items-center gap-3 text-sm">
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                :checked="(panelSlots[p.id] ?? 0) > 0"
                @change="togglePanel(p.id, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ p.code }} — {{ p.name }}</span>
            </label>
            <span v-if="(panelSlots[p.id] ?? 0) > 0" class="flex items-center gap-1 text-slate-600">
              Slots
              <input
                v-model.number="panelSlots[p.id]"
                type="number"
                min="1"
                :max="p.total_ad_slots"
                class="w-16 rounded border border-slate-200 px-2 py-1 text-xs"
              />
            </span>
          </li>
        </ul>
      </div>
      <div class="flex gap-2">
        <button
          type="submit"
          class="rounded-lg bg-[#e7bb0e] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#d4a90c] disabled:opacity-50"
          :disabled="saving"
        >
          Criar rascunho
        </button>
        <RouterLink to="/admin/contracts" class="rounded-lg border border-slate-200 px-4 py-2 text-sm">
          Voltar
        </RouterLink>
      </div>
    </form>
  </div>
</template>
