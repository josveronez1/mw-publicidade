<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAdminPanelMap } from '@/composables/useAdminPanelMap'
import { getSupabase } from '@/infrastructure/supabaseClient'
import {
  buildPanelAddressQuery,
  nominatimForward,
  nominatimReverse,
} from '@/infrastructure/geocoding/nominatim'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string | undefined)
const isNew = computed(() => !id.value)

const form = ref({
  code: '',
  name: '',
  slug: '',
  description: '',
  target_audience: '',
  panel_type: 'indoor_led',
  status: 'active',
  address_line1: '',
  city: '',
  state: '',
  postal_code: '',
  latitude: null as number | null,
  longitude: null as number | null,
  total_ad_slots: 1,
  is_published: false,
})

const saving = ref(false)
const err = ref<string | null>(null)
const geocodingLoading = ref(false)
const geocodingError = ref<string | null>(null)
const reverseLabel = ref<string | null>(null)
const allowAutoGeocode = ref(false)
const mapEl = ref<HTMLElement | null>(null)

const advLatStr = ref('')
const advLngStr = ref('')

const pinLat = computed<number | null>({
  get() {
    const v = form.value.latitude
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  },
  set(v: number | null) {
    form.value.latitude = v
  },
})

const pinLng = computed<number | null>({
  get() {
    const v = form.value.longitude
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  },
  set(v: number | null) {
    form.value.longitude = v
  },
})

const { init: initMap } = useAdminPanelMap(mapEl, pinLat, pinLng)

const addressReady = computed(
  () =>
    !!form.value.address_line1.trim() &&
    !!form.value.city.trim() &&
    !!form.value.state.trim(),
)

function formatCoord(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—'
  return n.toFixed(6)
}

/** Aceita vírgula decimal (pt-BR). */
function parseCoord(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = Number(String(v ?? '').trim().replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

function syncAdvancedInputs() {
  advLatStr.value =
    form.value.latitude != null && Number.isFinite(form.value.latitude)
      ? String(form.value.latitude)
      : ''
  advLngStr.value =
    form.value.longitude != null && Number.isFinite(form.value.longitude)
      ? String(form.value.longitude)
      : ''
}

function onAdvancedToggle(ev: Event) {
  const el = ev.target as HTMLDetailsElement
  if (el.open) syncAdvancedInputs()
}

function applyAdvancedCoords() {
  const lat = parseCoord(advLatStr.value)
  const lng = parseCoord(advLngStr.value)
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    err.value = 'Coordenadas avançadas inválidas.'
    return
  }
  err.value = null
  form.value.latitude = lat
  form.value.longitude = lng
}

async function runForwardGeocode() {
  if (!addressReady.value) return
  const q = buildPanelAddressQuery({
    address_line1: form.value.address_line1,
    city: form.value.city,
    state: form.value.state,
    postal_code: form.value.postal_code,
  })
  geocodingLoading.value = true
  geocodingError.value = null
  try {
    const hit = await nominatimForward(q)
    if (!hit) {
      geocodingError.value =
        'Não encontramos esse endereço. Ajuste os campos ou posicione o pin no mapa (clique ou arraste).'
      return
    }
    form.value.latitude = hit.lat
    form.value.longitude = hit.lon
    reverseLabel.value =
      hit.displayName ?? (await nominatimReverse(hit.lat, hit.lon)) ?? null
  } catch (e) {
    console.error(e)
    geocodingError.value = 'Falha ao consultar o geocodificador. Tente de novo em instantes.'
  } finally {
    geocodingLoading.value = false
  }
}

let geocodeDebounce: ReturnType<typeof setTimeout> | null = null
watch(
  () => [
    form.value.address_line1,
    form.value.city,
    form.value.state,
    form.value.postal_code,
  ],
  () => {
    if (!allowAutoGeocode.value) return
    if (geocodeDebounce) {
      clearTimeout(geocodeDebounce)
      geocodeDebounce = null
    }
    geocodingError.value = null
    if (!addressReady.value) return
    geocodeDebounce = setTimeout(() => {
      geocodeDebounce = null
      runForwardGeocode()
    }, 900)
  },
)

let reverseDebounce: ReturnType<typeof setTimeout> | null = null
watch(
  () => [form.value.latitude, form.value.longitude] as const,
  () => {
    const lat = form.value.latitude
    const lng = form.value.longitude
    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      reverseLabel.value = null
      return
    }
    if (reverseDebounce) clearTimeout(reverseDebounce)
    reverseDebounce = setTimeout(async () => {
      reverseDebounce = null
      const la = form.value.latitude
      const ln = form.value.longitude
      if (la === null || ln === null) return
      reverseLabel.value = await nominatimReverse(la, ln)
    }, 450)
  },
)

onMounted(async () => {
  if (!isNew.value) {
    const sb = getSupabase()
    const { data, error } = await sb.from('panels').select('*').eq('id', id.value!).single()
    if (error) {
      err.value = error.message
    } else if (data) {
      form.value = {
        code: data.code,
        name: data.name,
        slug: data.slug,
        description: data.description ?? '',
        target_audience: data.target_audience ?? '',
        panel_type: data.panel_type,
        status: data.status,
        address_line1: data.address_line1 ?? '',
        city: data.city ?? '',
        state: data.state ?? '',
        postal_code: data.postal_code ?? '',
        latitude: typeof data.latitude === 'number' ? data.latitude : null,
        longitude: typeof data.longitude === 'number' ? data.longitude : null,
        total_ad_slots: data.total_ad_slots,
        is_published: data.is_published,
      }
      if (form.value.latitude != null && form.value.longitude != null) {
        const rev = await nominatimReverse(form.value.latitude, form.value.longitude)
        reverseLabel.value = rev
      }
    }
  }
  await nextTick()
  initMap()
  allowAutoGeocode.value = true
})

async function save() {
  saving.value = true
  err.value = null
  try {
    const lat = form.value.latitude
    const lng = form.value.longitude
    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      err.value =
        'Defina a localização no mapa: preencha endereço (logradouro, cidade e UF) e aguarde a busca, ou clique/arraste o pin.'
      return
    }
    const sb = getSupabase()
    const payload = { ...form.value, latitude: lat, longitude: lng }
    if (isNew.value) {
      const { data, error } = await sb.from('panels').insert(payload).select('id')
      if (error) {
        err.value = error.message
        return
      }
      const row = data?.[0]
      if (!row?.id) {
        err.value =
          'Nenhuma linha retornada ao salvar. Confira se sua conta é admin e se o RLS do projeto está aplicado.'
        return
      }
      await router.replace(`/admin/panels/${row.id}/edit`)
    } else {
      const { error } = await sb.from('panels').update(payload).eq('id', id.value!)
      if (error) {
        err.value = error.message
        return
      }
      await router.push('/admin/panels')
    }
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Erro inesperado ao salvar.'
    console.error(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold text-slate-900">
      {{ isNew ? 'Novo painel' : 'Editar painel' }}
    </h1>
    <p v-if="err" class="mt-2 text-sm text-red-600">{{ err }}</p>
    <form class="mt-6 max-w-xl space-y-3" @submit.prevent="save">
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block text-xs font-medium text-slate-600">
          Código
          <input v-model="form.code" required class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label class="block text-xs font-medium text-slate-600">
          Slug (identificador na URL, só letras, números e hífens)
          <input
            v-model="form.slug"
            required
            placeholder="ex.: espirito-santo-centro"
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label class="block text-xs font-medium text-slate-600">
        Nome
        <input v-model="form.name" required class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </label>
      <label class="block text-xs font-medium text-slate-600">
        Público-alvo
        <input v-model="form.target_audience" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </label>
      <label class="block text-xs font-medium text-slate-600">
        Descrição
        <textarea v-model="form.description" rows="2" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </label>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block text-xs font-medium text-slate-600">
          Status operacional
          <select v-model="form.status" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="planning">Planejamento</option>
            <option value="installation">Instalação</option>
            <option value="active">Ativo</option>
            <option value="maintenance">Manutenção</option>
            <option value="inactive">Inativo</option>
          </select>
        </label>
        <label class="block text-xs font-medium text-slate-600">
          Vagas (slots)
          <input v-model.number="form.total_ad_slots" type="number" min="1" required class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </div>
      <label class="flex items-center gap-2 text-sm text-slate-700">
        <input v-model="form.is_published" type="checkbox" />
        Publicar no Media Kit
      </label>

      <div class="border-t border-slate-200 pt-4">
        <h2 class="text-sm font-semibold text-slate-900">Endereço do painel</h2>
        <p class="mt-1 text-xs text-slate-500">
          Preencha o endereço; o sistema posiciona o pin automaticamente. Confira no mapa e arraste ou clique para ajustar.
        </p>
        <label class="mt-3 block text-xs font-medium text-slate-600">
          Logradouro e número
          <input
            v-model="form.address_line1"
            required
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <div class="mt-3 grid gap-3 sm:grid-cols-3">
          <label class="block text-xs font-medium text-slate-600">
            Cidade
            <input v-model="form.city" required class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label class="block text-xs font-medium text-slate-600">
            UF
            <input
              v-model="form.state"
              required
              maxlength="2"
              placeholder="RS"
              class="mt-1 w-full uppercase rounded-lg border border-slate-200 px-3 py-2 text-sm"
              @blur="form.state = form.state.trim().toUpperCase().slice(0, 2)"
            />
          </label>
          <label class="block text-xs font-medium text-slate-600">
            CEP
            <input v-model="form.postal_code" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            :disabled="geocodingLoading || !addressReady"
            @click="runForwardGeocode"
          >
            {{ geocodingLoading ? 'Buscando…' : 'Atualizar posição no mapa' }}
          </button>
          <span v-if="geocodingLoading" class="text-xs text-slate-500">Consultando Nominatim…</span>
        </div>
        <p v-if="geocodingError" class="mt-2 text-xs text-amber-800">{{ geocodingError }}</p>
      </div>

      <div class="border-t border-slate-200 pt-4">
        <h2 class="text-sm font-semibold text-slate-900">Mapa</h2>
        <p class="mt-1 text-xs text-slate-500">
          Confira se o pin está no local do painel. Arraste-o ou clique no mapa para corrigir.
        </p>
        <div
          ref="mapEl"
          class="admin-panel-map z-0 mt-3 h-[min(320px,55vh)] w-full min-h-[240px] overflow-hidden rounded-lg border border-slate-200"
        />
        <p class="mt-2 text-xs text-slate-600">
          Coordenadas atuais:
          <span class="font-mono text-slate-800">{{ formatCoord(form.latitude) }}</span>,
          <span class="font-mono text-slate-800">{{ formatCoord(form.longitude) }}</span>
        </p>
        <p v-if="reverseLabel" class="mt-1 text-xs text-slate-500">
          Ponto aproximado no mapa:
          <span class="text-slate-700">{{ reverseLabel }}</span>
        </p>
      </div>

      <details class="rounded-lg border border-slate-200 p-3 text-sm" @toggle="onAdvancedToggle">
        <summary class="cursor-pointer font-medium text-slate-700">Avançado — editar latitude/longitude manualmente</summary>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <label class="block text-xs font-medium text-slate-600">
            Latitude
            <input v-model="advLatStr" type="text" inputmode="decimal" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label class="block text-xs font-medium text-slate-600">
            Longitude
            <input v-model="advLngStr" type="text" inputmode="decimal" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
        </div>
        <button
          type="button"
          class="mt-3 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200"
          @click="applyAdvancedCoords"
        >
          Aplicar coordenadas ao mapa
        </button>
      </details>

      <div class="flex gap-2 pt-2">
        <button
          type="submit"
          class="rounded-lg bg-[#e7bb0e] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#d4a90c] disabled:opacity-50"
          :disabled="saving"
        >
          Salvar
        </button>
        <RouterLink to="/admin/panels" class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">
          Cancelar
        </RouterLink>
      </div>
    </form>
  </div>
</template>
