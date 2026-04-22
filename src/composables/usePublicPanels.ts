import { ref } from 'vue'
import { getSupabase } from '@/infrastructure/supabaseClient'
import { runPostgrestWithRetry } from '@/composables/retryRequest'

export type PublicPanelRow = {
  id: string
  code: string
  name: string
  slug: string
  latitude: number
  longitude: number
  status: string
  target_audience: string | null
  target_audience_tags?: string[] | null
  description: string | null
  city: string | null
  state: string | null
  address_line1: string | null
  total_ad_slots: number
  thumbnail_path: string | null
  gallery_paths?: string[] | null
  width_m?: number | null
  height_m?: number | null
}

export function usePublicPanels() {
  const panels = ref<PublicPanelRow[]>([])
  const slotsByPanel = ref<Record<string, number>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** Evita que uma carga lenta sobrescreva o resultado de uma carga mais recente. */
  let loadSeq = 0

  async function load() {
    const seq = ++loadSeq
    loading.value = true
    error.value = null
    const sb = getSupabase()
    try {
      const { data, error: e } = await runPostgrestWithRetry(() =>
        sb
          .from('panels')
          .select(
            'id, code, name, slug, latitude, longitude, status, target_audience, target_audience_tags, description, city, state, address_line1, total_ad_slots, thumbnail_path, gallery_paths, width_m, height_m',
          )
          .eq('is_published', true)
          .order('name'),
      )
      if (seq !== loadSeq) return
      if (e) {
        error.value = e.message
        panels.value = []
        slotsByPanel.value = {}
        return
      }
      panels.value = (data ?? []) as PublicPanelRow[]
      if (panels.value.length === 0) {
        slotsByPanel.value = {}
        return
      }
      const map: Record<string, number> = {}
      const results = await Promise.all(
        panels.value.map((p) =>
          runPostgrestWithRetry(() =>
            sb.rpc('panel_slots_used_public', { p_panel_id: p.id }),
          ),
        ),
      )
      if (seq !== loadSeq) return
      for (let i = 0; i < panels.value.length; i++) {
        const p = panels.value[i]!
        const r = results[i]!
        if (r.error) {
          map[p.id] = 0
        } else {
          const n = r.data
          map[p.id] = typeof n === 'number' ? n : 0
        }
      }
      slotsByPanel.value = map
    } catch (err) {
      if (seq !== loadSeq) return
      const msg = err instanceof Error ? err.message : 'Falha ao carregar painéis.'
      error.value = msg
      panels.value = []
      slotsByPanel.value = {}
    } finally {
      if (seq === loadSeq) loading.value = false
    }
  }

  return { panels, slotsByPanel, loading, error, load }
}
