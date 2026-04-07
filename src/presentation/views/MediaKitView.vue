<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { usePublicPanels } from '@/composables/usePublicPanels'
import { useSiteSettings } from '@/composables/useSiteSettings'
import { useMapboxPublicMap } from '@/composables/useMapboxPublicMap'

const { panels, slotsByPanel, loading, error, load } = usePublicPanels()
const { orgName, load: loadSettings } = useSiteSettings()
const mapEl = ref<HTMLElement | null>(null)
const { init } = useMapboxPublicMap(mapEl, panels)

const quote = ref({
  name: '',
  email: '',
  phone: '',
  company: '',
  message: '',
  website: '' as string,
})
const quoteSending = ref(false)
const quoteMsg = ref<string | null>(null)
const hasMapboxToken = !!import.meta.env.VITE_MAPBOX_TOKEN

onMounted(async () => {
  await loadSettings()
  await load()
  await nextTick()
  if (import.meta.env.VITE_MAPBOX_TOKEN) init()
})

async function submitQuote() {
  quoteMsg.value = null
  if (quote.value.website) {
    quoteMsg.value = 'Envio rejeitado.'
    return
  }
  quoteSending.value = true
  const { getSupabase } = await import('@/infrastructure/supabaseClient')
  const sb = getSupabase()
  const { error: e } = await sb.from('quote_requests').insert({
    name: quote.value.name,
    email: quote.value.email,
    phone: quote.value.phone || null,
    company: quote.value.company || null,
    message: quote.value.message || null,
    honeypot: quote.value.website || null,
  })
  quoteSending.value = false
  if (e) quoteMsg.value = e.message
  else {
    quoteMsg.value = 'Enviado. Entraremos em contato.'
    quote.value = {
      name: '',
      email: '',
      phone: '',
      company: '',
      message: '',
      website: '',
    }
  }
}
</script>

<template>
  <div class="flex min-h-full flex-col bg-white">
    <header
      class="flex items-center justify-between border-b border-slate-200 px-4 py-3"
    >
      <RouterLink to="/" class="flex items-center gap-3">
        <img
          src="/mw-logo.jpg"
          alt=""
          class="h-10 w-10 rounded-xl object-cover"
        />
        <span class="font-semibold text-slate-900">{{ orgName }}</span>
      </RouterLink>
      <div class="flex gap-4 text-sm">
        <RouterLink
          to="/login"
          class="font-medium text-slate-600 hover:text-slate-900"
        >
          Área restrita
        </RouterLink>
      </div>
    </header>

    <div class="grid flex-1 lg:grid-cols-[1fr_380px]">
      <div class="relative min-h-[420px] lg:min-h-[calc(100vh-57px)]">
        <div v-if="!hasMapboxToken" class="p-8 text-center text-slate-500">
          Defina <code class="rounded bg-slate-100 px-1">VITE_MAPBOX_TOKEN</code> no
          <code class="rounded bg-slate-100 px-1">.env</code> para exibir o mapa.
        </div>
        <div ref="mapEl" class="absolute inset-0" />
      </div>

      <aside class="border-t border-slate-200 lg:border-l lg:border-t-0">
        <div class="max-h-[50vh] overflow-auto border-b border-slate-200 p-4 lg:max-h-none">
          <h2 class="text-sm font-semibold text-slate-900">Pontos publicados</h2>
          <p v-if="loading" class="mt-2 text-sm text-slate-500">Carregando…</p>
          <p v-else-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
          <ul v-else class="mt-3 space-y-3">
            <li
              v-for="p in panels"
              :key="p.id"
              class="rounded-lg border border-slate-200 p-3 text-sm"
            >
              <p class="font-medium text-slate-900">{{ p.name }}</p>
              <p class="text-slate-600">{{ p.address_line1 }}, {{ p.city }} / {{ p.state }}</p>
              <p v-if="p.target_audience" class="mt-1 text-slate-500">
                Público: {{ p.target_audience }}
              </p>
              <p class="mt-1 text-xs text-slate-500">
                Vagas ocupadas:
                <span class="font-semibold text-slate-800">{{
                  slotsByPanel[p.id] ?? 0
                }}</span>
                / {{ p.total_ad_slots }}
              </p>
            </li>
          </ul>
        </div>

        <div class="p-4">
          <h2 class="text-sm font-semibold text-slate-900">Solicitar proposta</h2>
          <p class="mt-1 text-xs text-slate-500">
            Preços sob consulta. Envie seus dados e retornamos em breve.
          </p>
          <form class="mt-3 space-y-2" @submit.prevent="submitQuote">
            <input
              v-model="quote.website"
              class="hidden"
              tabindex="-1"
              autocomplete="off"
              aria-hidden="true"
            />
            <input
              v-model="quote.name"
              required
              placeholder="Nome"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              v-model="quote.email"
              type="email"
              required
              placeholder="E-mail"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              v-model="quote.phone"
              placeholder="Telefone"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              v-model="quote.company"
              placeholder="Empresa"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <textarea
              v-model="quote.message"
              placeholder="Mensagem"
              rows="3"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              class="w-full rounded-lg bg-[#e7bb0e] px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-[#d4a90c] disabled:opacity-50"
              :disabled="quoteSending"
            >
              Enviar
            </button>
            <p v-if="quoteMsg" class="text-xs text-slate-600">{{ quoteMsg }}</p>
          </form>
          <p class="mt-4 text-[10px] leading-relaxed text-slate-400">
            Ao enviar, você concorda com o tratamento dos dados conforme a política de
            privacidade da empresa (texto jurídico a publicar).
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
