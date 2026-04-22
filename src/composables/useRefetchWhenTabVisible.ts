import { onMounted, onUnmounted } from 'vue'

/**
 * Após o utilizador voltar ao separador, refaz dados (ex. `loadRows` em modo silencioso).
 * A fiabilidade do Supabase/Auth com troca de aba depende de **não** fazer `await` de
 * chamadas ao cliente no callback de `onAuthStateChange` (ver `src/stores/auth.ts`);
 * deste modo não precisamos de recriar o cliente a cada `visibilitychange`.
 */
export function useRefetchWhenTabVisible(
  fn: () => void | Promise<void>,
  options: { debounceMs?: number; ignoreMsAfterMount?: number } = {},
) {
  const debounceMs = options.debounceMs ?? 100
  const ignoreMsAfterMount = options.ignoreMsAfterMount ?? 500

  let debounceT: ReturnType<typeof setTimeout> | null = null
  let safeAfter = 0

  function onVisibility() {
    if (document.visibilityState !== 'visible') return
    if (Date.now() < safeAfter) return
    if (debounceT) clearTimeout(debounceT)
    debounceT = setTimeout(() => {
      debounceT = null
      void Promise.resolve(fn())
    }, debounceMs)
  }

  onMounted(() => {
    safeAfter = Date.now() + ignoreMsAfterMount
    document.addEventListener('visibilitychange', onVisibility)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    if (debounceT) clearTimeout(debounceT)
  })
}
