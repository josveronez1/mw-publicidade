# Depuração por causa raiz (em vez de remendos)

Este documento fixa **como** encaramos problemas difíceis no **MW Publicidade**: reduzir tempo percorrido a “tapar a ferida” e investir em **entender o sistema** (SDK, browser, lock de auth, etc.) até termos um **fix que trata a causa**, não só o sintoma.

---

## 1. Porque remendos falham

| Abordagem | Risco |
|-----------|--------|
| Heurísticas (`se X então workaround`) | Escondem o bug real; em outro timing (troca de aba, rede lenta) o sintoma volta. |
| Reset agressivo (recriar cliente, F5 mental) | Caro em performance, frágil, e pode mascarar código que **viola** contratos da biblioteca. |
| Copiar soluções de fórum sem validar | O stack (versão do `supabase-js`, Vue, Vite) pode ser outro; o remendo vira dívida técnica. |

Objetivo: **uma explicação que liga sintoma → mecanismo → correção mínima alinhada ao upstream**.

---

## 2. Processo sugerido

1. **Reproduzir com o mínimo de variáveis** — mesmo passo, mesmo browser, mesmo fluxo (ex.: “login → trocar de aba 10s → voltar”).
2. **Separar camadas** — é rede? É RLS? É o cliente JS? É o router? Anotar o que *não* resolve (ex.: refresh total da página resolve → indício de estado cliente / lock, não de servidor).
3. **Ler o que o fornecedor já documentou** — Supabase: troubleshooting, issues abertas no `supabase-js` / `auth-js`. Muitos “segue sem devolver” estão ligados a **deadlock no auth** ou a **Realtime em aba em segundo plano**.
4. **Formular hipótese testável** — “Se o callback X for síncrono e o I/O for adiado, o lock deixa de bloquear.”
5. **Corrigir na origem** — ajustar *nosso* uso da API (padrão recomendado), não empilhar mais camadas em cima.
6. **Registar no repo** — comentário curto no código + (se for um padrão recurrente) este ficheiro ou `AGENTS.md`.

---

## 3. Anti-padrões a evitar no nosso código

- **`async` + `await` de chamadas ao mesmo cliente Supabase dentro de `auth.onAuthStateChange`** — o GoTrue mantém um lock; I/O ali pode **deadlock** e fazer com que *qualquer* outro `getSupabase().from(...)` pare de responder. O fix correcto é **diferir** (ex. `setTimeout(..., 0)`) a ligação que bate na API, conforme recomendações do ecossystem ([auth-js#762](https://github.com/supabase/auth-js/issues/762), discussões em [supabase-js](https://github.com/supabase/supabase-js/issues)).
- **Assumir “aba em fundo partiu o singleton”** sem prova — por vezes o singleton está bem; o que está preso é o fluxo de auth. Recriar o cliente em todo o `visibilitychange` é custoso e pode ser desnecessário se a causa for o callback.

---

## 4. Caso de estudo (neste repositório): “só o F5 resolve” após trocar de aba

**Sintoma:** UI em “carregando”, pedidos que não completam, até refresh completo.

**Causa raiz identificada:** `onAuthStateChange` com `await loadProfile()` (query `profiles` no mesmo cliente). Com refresh de token / visibilidade, o callback corria **com o lock de auth** ainda em vigor → **deadlock** com o uso normal do cliente.

**Correção:** callback **síncrono**; `loadProfile` apenas **depois**, fora do ciclo do lock (ex. `setTimeout(..., 0)`). Removido o hábito de **recriar o cliente** em todo o foco da aba como “fix” principal.

**Onde ver no código:** `src/stores/auth.ts` (comentário no `onAuthStateChange`).

---

## 5. Quando um remendo *ainda* faz sentido

- **Mitigação temporária** com data de remoção e ticket.
- **Limites externos** (browser, rede) onde o único controlo é UX (timeout, mensagem, retry) — mas o desenho deve estar **documentado** e não contradizer o item 3 acima.

---

## 6. Referências úteis

- [Supabase — Realtime em aplicações em segundo plano](https://supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794) (WebSocket / heartbeat; distinto do deadlock de auth, mas aparece em discussões de “aba em fundo”.)
- Issues de deadlock / `onAuthStateChange` no GitHub `supabase-js` e `auth-js` (pesquisar por *deadlock*, *onAuthStateChange*, *acquire lock*).

Este ficheiro não substitui `docs/database.md` nem `AGENTS.md`; complementa a postura de engenharia quando o bug “não faz sentido” à primeira vista.
