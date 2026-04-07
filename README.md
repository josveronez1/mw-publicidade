# MW Mídia Indoor — gestão

Vue 3 + Vite + Tailwind + Pinia + Supabase + Mapbox. Ver [docs/index.md](docs/index.md).

## Requisitos

- Node 20+
- Projeto Supabase (PostgreSQL + Auth)
- Token Mapbox (mapa público)

## Setup

```bash
cp .env.example .env
# Preencha VITE_SUPABASE_* e VITE_MAPBOX_TOKEN
npm install
npm run dev
```

Aplique as migrations no Supabase (SQL Editor ou CLI):

```bash
supabase db push
# ou copie o conteúdo de supabase/migrations/*.sql
```

### Primeiro administrador

1. Crie usuário em Authentication (ou pela tela de login após signup, se habilitado).
2. No SQL Editor:

```sql
update public.profiles set role = 'admin' where id = '<uuid do usuário>';
```

### Logo

Arquivo estático: [public/mw-logo.jpg](public/mw-logo.jpg).

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build produção |
| `npm run test:run` | Vitest (domínio) |
| `npm run preview` | Preview do build |

## Edge Function (PDF)

Esqueleto em `supabase/functions/generate-contract-pdf/`. Deploy com Supabase CLI quando for implementar HTML→PDF.

## Pagamentos (Fase 5)

A app usa `PaymentGatewayStub` ao **ativar** contrato na lista admin; troque pela implementação Mercado Pago em Edge Function conforme [docs/integracao-pagamentos.md](docs/integracao-pagamentos.md).

## Upload de criativos

UI de upload na área do cliente fica como próximo passo; tabela `creative_assets` e RLS já estão na migration.
