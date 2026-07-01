-- Svuota TUTTE le tabelle dati (per ri-eseguire la migrazione da capo).
-- NON tocca lo schema, solo i dati. TRUNCATE ... CASCADE azzera anche le identity.
-- Eseguire nel SQL editor di Supabase PRIMA di rilanciare migrate.mjs --commit.
truncate
  nic_item_alt, nic_item, nic_pasto, nic_day_integ, nic_day,
  noemi_slot_opt, noemi_slot, noemi_fixed, noemi_meal, noemi_settimana,
  programma_blocco, programma_sessione, programma_week, programma_allegato,
  allenamenti_cfg, programma,
  schedule_giorno, coach_config,
  spesa_item_proprietario, spesa_item, dispensa_item_proprietario, dispensa_item,
  spesa_storico_voce, spesa_storico, spesa_meta, spesa_categoria,
  traccia_salita, traccia_lap, traccia, attivita,
  categoria_alimentare, disciplina, proprietario
restart identity cascade;
