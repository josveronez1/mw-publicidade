create or replace function public.next_contract_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := extract(year from current_date)::int;
  n int;
begin
  insert into public.contract_number_seq (y, last_n)
  values (y, 1)
  on conflict (y) do update
    set last_n = contract_number_seq.last_n + 1
  returning last_n into n;
  return 'MW-' || y::text || '-' || lpad(n::text, 4, '0');
end;
$$;

grant execute on function public.next_contract_number() to authenticated;
