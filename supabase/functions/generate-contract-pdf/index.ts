/**
 * Edge Function: gera PDF do contrato (MVP — retorna instrução).
 * Produção: HTML → PDF (ex. Playwright/Puppeteer) + upload Storage.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(
    JSON.stringify({
      ok: true,
      message:
        'Implementar renderização PDF no servidor e gravar em Storage (ver docs/contratos-pdf).',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
