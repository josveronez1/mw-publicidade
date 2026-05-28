import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getSupabase, resetSupabaseBrowserClient } from '@/infrastructure/supabaseClient'
import type { AuthChangeEvent, Session, Subscription } from '@supabase/supabase-js'

/** Evita duas execuções paralelas de `initialize()` (ex.: guards do router) registrando `onAuthStateChange` várias vezes. */
let authInitPromise: Promise<void> | null = null

/** `onAuthStateChange` do cliente actual — desligar antes de `resetSupabaseBrowserClient()`. */
let authStateSubscription: Subscription | null = null
let recoverInFlight: Promise<void> | null = null

/**
 * Durante `recoverFromBackgroundTab`, se a sessão for do mesmo `profiles.id` já em memória,
 * evita 1 ida a `profiles` (a parte mais lenta além de `getSession` + novo cliente).
 */
let skipLoadProfileOnRecoverIfSameUser = false

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const profile = ref<{
    id: string
    role: string
    client_id: string | null
    full_name: string | null
  } | null>(null)
  const initialized = ref(false)

  const isAdmin = computed(
    () =>
      profile.value?.role === 'admin' ||
      profile.value?.role === 'super_admin',
  )
  const isClientUser = computed(
    () => profile.value?.role === 'client_user' && !!profile.value?.client_id,
  )

  /** @returns true se o perfil foi carregado; false se RLS/linha em falta/erro. */
  async function loadProfile(userId: string): Promise<boolean> {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('profiles')
      .select('id, role, client_id, full_name')
      .eq('id', userId)
      .single()
    if (error) {
      console.error(error)
      profile.value = null
      return false
    }
    profile.value = data as typeof profile.value
    return true
  }

  async function initialize() {
    if (initialized.value) return
    if (authInitPromise) {
      await authInitPromise
      return
    }
    authInitPromise = (async () => {
      const sb = getSupabase()
      const { data } = await sb.auth.getSession()
      session.value = data.session
      const userId = data.session?.user?.id
      if (userId) {
        if (
          skipLoadProfileOnRecoverIfSameUser &&
          profile.value?.id === userId
        ) {
          // Perfil ainda válido; JWT é reposto por getSession
        } else {
          await loadProfile(userId)
        }
      } else {
        profile.value = null
      }
      // Nunca fazer I/O com o mesmo cliente `supabase` (ex. `.from()`) *dentro* deste
      // callback com `async`/`await`. O GoTrue mantém um lock; await de Supabase aqui
      // causa deadlock e pedidos "que nunca devolvem" (comum após trocar de aba + refresh
      // de token). Diferir com `setTimeout(0)`: padrão em auth-js e docs Supabase.
      const { data: listener } = sb.auth.onAuthStateChange(
        (_event: AuthChangeEvent, sess: Session | null) => {
          session.value = sess
          if (sess?.user) {
            const uid = sess.user.id
            setTimeout(() => {
              void loadProfile(uid)
            }, 0)
          } else {
            profile.value = null
          }
        },
      )
      authStateSubscription = listener?.subscription ?? null
      initialized.value = true
    })()
    try {
      await authInitPromise
    } finally {
      authInitPromise = null
    }
  }

  const PROFILE_MISSING_MESSAGE =
    'Não foi possível carregar o teu perfil. Verifica com o administrador se a tua conta tem registo em "profiles" e permissões corretas.'

  async function signIn(email: string, password: string) {
    const sb = getSupabase()
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) return { error }
    if (!data.user) {
      return { error: { message: 'Resposta de login inesperada.' } }
    }
    session.value = data.session
    const ok = await loadProfile(data.user.id)
    if (!ok) {
      await sb.auth.signOut()
      session.value = null
      profile.value = null
      return { error: { message: PROFILE_MISSING_MESSAGE } }
    }
    return { error: null }
  }

  /**
   * Recria o cliente (escape hatch p.ex. se algo externo deixou o processo de auth preso).
   * O sintoma "só o F5 resolve" com troca de aba vinha, em geral, de deadlock no
   * `onAuthStateChange` (ver comentário acima), não de um "cliente corrompido" — aí o
   * fix correcto é não fazer I/O com await dentro do callback, não forçar reset em todo o foco.
   */
  async function recoverFromBackgroundTab() {
    if (recoverInFlight) return recoverInFlight
    recoverInFlight = (async () => {
      try {
        skipLoadProfileOnRecoverIfSameUser = true
        if (authStateSubscription) {
          try {
            authStateSubscription.unsubscribe()
          } catch (e) {
            console.error(e)
          }
          authStateSubscription = null
        }
        authInitPromise = null
        resetSupabaseBrowserClient()
        initialized.value = false
        await initialize()
      } finally {
        skipLoadProfileOnRecoverIfSameUser = false
        recoverInFlight = null
      }
    })()
    return recoverInFlight
  }

  async function signOut() {
    const sb = getSupabase()
    try {
      await sb.auth.signOut()
    } catch (e) {
      console.error(e)
    } finally {
      session.value = null
      profile.value = null
    }
  }

  return {
    session,
    profile,
    initialized,
    isAdmin,
    isClientUser,
    initialize,
    recoverFromBackgroundTab,
    signIn,
    signOut,
  }
})
