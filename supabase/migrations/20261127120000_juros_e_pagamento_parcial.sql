-- Contas a receber (Pedro, 2026-11-27):
-- 1) Juros: quem paga em atraso pode pagar juros/multa. O juro fica guardado no boleto,
--    mas não vira crédito nem ponto (1 crédito = R$ 1 da parcela paga).
-- 2) Pagamento parcial: se a paciente paga só parte da parcela, o boleto fica com o valor
--    pago e o que falta vira outro boleto, com o mesmo vencimento.

alter table public.boletos
  add column interest numeric(12, 2) not null default 0 check (interest >= 0),
  add column label text,                                          -- ex.: "Restante da parcela 3"
  add column split_from uuid references public.boletos (id) on delete set null;

-- Dá baixa no boleto. p_paid = quanto da parcela foi pago (sem os juros); p_interest = juros/multa.
-- Se p_paid for menor que o valor do boleto, cria outro boleto com o restante. Devolve o id dele (ou null).
create or replace function public.pay_boleto(p_boleto uuid, p_paid numeric, p_interest numeric default 0)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  b public.boletos%rowtype;
  v_rest numeric(12, 2);
  v_new uuid;
begin
  if not (select public.is_staff()) then
    raise exception 'Só a equipe pode dar baixa' using errcode = '42501';
  end if;
  select * into b from public.boletos where id = p_boleto for update;
  if not found then raise exception 'Boleto não encontrado'; end if;
  if b.paid_at is not null then raise exception 'Esse boleto já está pago'; end if;
  p_paid := round(coalesce(p_paid, b.amount), 2);
  p_interest := round(coalesce(p_interest, 0), 2);
  if p_paid <= 0 or p_paid > b.amount then
    raise exception 'Valor pago inválido' using errcode = '22023';
  end if;
  if p_interest < 0 then raise exception 'Juros inválidos' using errcode = '22023'; end if;

  v_rest := b.amount - p_paid;
  update public.boletos
     set amount = p_paid, interest = p_interest, paid_at = now(), paid_by = (select auth.uid())
   where id = b.id;

  if v_rest > 0 then
    insert into public.boletos (plan_id, number, due_date, amount, barcode, label, split_from)
    values (
      b.plan_id,
      (select max(number) + 1 from public.boletos where plan_id = b.plan_id),
      b.due_date,
      v_rest,
      null,
      coalesce(b.label, 'Restante da ' || case when b.number = 1 then 'entrada' else 'parcela ' || (b.number - 1) end),
      b.id
    )
    returning id into v_new;
  end if;
  return v_new;
end;
$$;

revoke execute on function public.pay_boleto(uuid, numeric, numeric) from public, anon;
grant execute on function public.pay_boleto(uuid, numeric, numeric) to authenticated;
