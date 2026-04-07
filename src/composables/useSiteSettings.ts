import { ref } from 'vue'
import { getSupabase } from '@/infrastructure/supabaseClient'

export function useSiteSettings() {
  const orgName = ref<string>('MW Mídia Indoor')
  const loading = ref(false)

  async function load() {
    loading.value = true
    const sb = getSupabase()
    const { data } = await sb
      .from('site_settings')
      .select('org_display_name')
      .limit(1)
      .maybeSingle()
    if (data?.org_display_name) orgName.value = data.org_display_name
    loading.value = false
  }

  async function save(name: string) {
    const sb = getSupabase()
    const { data: row } = await sb.from('site_settings').select('id').limit(1).maybeSingle()
    if (!row?.id) return { error: 'Sem configuração' }
    const { error } = await sb
      .from('site_settings')
      .update({ org_display_name: name })
      .eq('id', row.id)
    if (!error) orgName.value = name
    return { error: error?.message }
  }

  return { orgName, loading, load, save }
}
