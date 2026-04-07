# Banco de dados e RLS (Supabase)

## Migrations

Ordem em `supabase/migrations/`:

1. `20250407120000_initial_schema.sql` — enums, tabelas, RLS, `panel_slots_used_public`, trigger perfil em `auth.users`.
2. `20250407120100_contract_number_fn.sql` — `next_contract_number()`.

## Tabelas principais

- `clients`, `profiles` (FK `auth.users`), `panels`, `site_settings`
- `contract_templates`, `contracts`, `contract_panels`
- `quote_requests`, `creative_assets`, `gateway_charges`
- `contract_number_seq` — sequência por ano para `MW-AAAA-NNNN`

## RLS (resumo)

| Tabela | anon | authenticated cliente | admin |
|--------|------|----------------------|-------|
| `panels` | SELECT se `is_published` | — | ALL |
| `site_settings` | SELECT | SELECT | ALL |
| `quote_requests` | INSERT (honeypot vazio) | idem | ALL |
| `contracts` | — | SELECT próprio `client_id` | ALL |
| Demais operacionais | — | conforme política | `is_admin()` |

Funções `SECURITY DEFINER`: `is_admin()`, `is_client_of(uuid)`, `panel_slots_used_public`, `next_contract_number`, `handle_new_user`.

## Storage (a criar no painel Supabase)

Buckets sugeridos:

- `panel-media` — fotos dos painéis (público leitura para paths referenciados em painéis publicados).
- `contracts-pdf` — PDFs gerados (privado; URLs assinadas ou via RLS storage policies).
- `creative-assets` — mídias do cliente.

Políticas de storage devem espelhar RLS das tabelas.

## Primeiro usuário admin

Após o primeiro cadastro:

```sql
update public.profiles set role = 'admin' where id = '<uuid do auth.users>';
```
