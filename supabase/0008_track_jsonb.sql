-- Migration 0008 — lap/climbs della traccia come JSONB (forma originale intervals.icu).
-- Erano stati normalizzati in tabelle con nomi-campo inventati → dati persi. Sono
-- oggetti opachi renderizzati dall'app con chiavi precise (lap: d,t,hr,cad,w;
-- climb: km,len_m,gain_m,grad,gmax,dur_s,hr,hrmax,cad,vam,spd): meglio jsonb, come geo/elev.
begin;

alter table traccia add column if not exists climbs jsonb;
alter table traccia add column if not exists laps jsonb;

drop table if exists traccia_salita;
drop table if exists traccia_lap;

commit;
