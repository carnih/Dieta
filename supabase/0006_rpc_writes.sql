-- Migration 0006 — RPC per le scritture "calde": ogni operazione in UNA chiamata
-- (invece di delete + N insert = tanti round-trip Italia↔Francoforte). SECURITY
-- INVOKER → la RLS resta applicata come l'utente autenticato (membro).
begin;

-- Sostituisce tutti gli articoli di una categoria (p_items = array [{t,d,owners}]).
create or replace function replace_spesa_categoria(p_cat text, p_items jsonb)
returns void language plpgsql security invoker as $$
declare it jsonb; new_id bigint; o text;
begin
  delete from spesa_item where categoria_key = p_cat;
  if p_items is null then return; end if;
  for it in select value from jsonb_array_elements(p_items) as t(value) loop
    if coalesce(it->>'t', '') = '' then continue; end if;
    insert into spesa_item (categoria_key, testo, preso)
      values (p_cat, it->>'t', coalesce((it->>'d')::boolean, false)) returning id into new_id;
    for o in select value from jsonb_array_elements_text(coalesce(it->'owners', '[]'::jsonb)) as t(value) loop
      insert into spesa_item_proprietario (item_id, proprietario_key) values (new_id, o);
    end loop;
  end loop;
end $$;

-- Sostituisce l'INTERA lista spesa (p_spesa = {categoria: [articoli]}).
create or replace function replace_spesa_all(p_spesa jsonb)
returns void language plpgsql security invoker as $$
declare cat text; arr jsonb;
begin
  delete from spesa_item;
  if p_spesa is null then return; end if;
  for cat, arr in select key, value from jsonb_each(p_spesa) loop
    perform replace_spesa_categoria(cat, arr);
  end loop;
end $$;

-- Sostituisce l'intera dispensa (p_items = array [{t,cat,active,owners}]).
create or replace function replace_pantry(p_items jsonb)
returns void language plpgsql security invoker as $$
declare it jsonb; new_id bigint; o text;
begin
  delete from dispensa_item;
  if p_items is null then return; end if;
  for it in select value from jsonb_array_elements(p_items) as t(value) loop
    if coalesce(it->>'t', '') = '' then continue; end if;
    insert into dispensa_item (categoria_key, testo, attivo)
      values (coalesce(it->>'cat', 'dispensa'), it->>'t', coalesce((it->>'active')::boolean, true)) returning id into new_id;
    for o in select value from jsonb_array_elements_text(coalesce(it->'owners', '[]'::jsonb)) as t(value) loop
      insert into dispensa_item_proprietario (dispensa_id, proprietario_key) values (new_id, o);
    end loop;
  end loop;
end $$;

-- Imposta l'override pasto libero per (data, pasto). p_val = {e?:bool, n?:bool} | null.
create or replace function set_override(p_data date, p_pasto text, p_val jsonb)
returns void language plpgsql security invoker as $$
begin
  delete from override_pasto where data = p_data and pasto = p_pasto;
  if p_val is null then return; end if;
  if coalesce((p_val->>'e')::boolean, false) then insert into override_pasto (data, pasto, persona) values (p_data, p_pasto, 'e'); end if;
  if coalesce((p_val->>'n')::boolean, false) then insert into override_pasto (data, pasto, persona) values (p_data, p_pasto, 'n'); end if;
end $$;

commit;
