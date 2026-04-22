-- Leitura no admin: null = ainda não vista (destaque + badge)
alter table public.quote_requests
  add column if not exists read_at timestamptz;

comment on column public.quote_requests.read_at is
  'Preenchido quando o admin abre/expande a solicitação; null = não lida.';
