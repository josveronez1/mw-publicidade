<script setup lang="ts">
import { onMounted } from 'vue'
import { ref } from 'vue'
import { useSiteSettings } from '@/composables/useSiteSettings'

const { orgName, load, save } = useSiteSettings()
const local = ref('')
const msg = ref<string | null>(null)

onMounted(async () => {
  await load()
  local.value = orgName.value
})

async function submit() {
  const { error } = await save(local.value)
  msg.value = error ?? 'Salvo.'
}
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold text-slate-900">Marca no Media Kit</h1>
    <p class="mt-1 text-sm text-slate-600">
      Nome exibido no cabeçalho público (logo continua em <code class="rounded bg-slate-100 px-1">/mw-logo.jpg</code>).
    </p>
    <form class="mt-6 max-w-md space-y-3" @submit.prevent="submit">
      <label class="block text-xs font-medium text-slate-600">
        Nome da organização
        <input v-model="local" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </label>
      <button
        type="submit"
        class="rounded-lg bg-[#e7bb0e] px-4 py-2 text-sm font-semibold text-slate-900"
      >
        Salvar
      </button>
      <p v-if="msg" class="text-sm text-slate-600">{{ msg }}</p>
    </form>
  </div>
</template>
