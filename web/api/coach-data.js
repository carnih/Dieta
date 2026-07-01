// Vercel Serverless Function: riassunto AGGIORNATO allenamenti per il GPT personalizzato.
// Legge da SUPABASE (REST con service_role → bypassa RLS, lettura diretta e veloce).
// Storico + settimana in corso + piano + SCHEDE COMPLETE (settimana corrente marcata) + obiettivo.
// Env su Vercel: COACH_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const num = v => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };

const SCHED_LBL = { corsa:'Corsa', bici:'Bici', nuoto:'Nuoto', palestra:'Palestra', padel:'Padel', brick:'Brick', forza:'Forza', riposo:'Riposo' };
const WD = { lun:'Lun', mar:'Mar', mer:'Mer', gio:'Gio', ven:'Ven', sab:'Sab', dom:'Dom' };
function mondayOf(d){ const x = new Date(d); const dow = (x.getDay()+6)%7; x.setHours(0,0,0,0); x.setDate(x.getDate()-dow); return x; }
function progWeek(prog, cfg, durata){
  const def = prog === 'forza' ? '2026-05-18' : '2026-06-01';
  const c = (cfg && cfg[prog]) || {};
  const start = mondayOf(new Date((c.start || def) + 'T00:00:00'));
  if (isNaN(start)) return null;
  const wk = Math.round((mondayOf(new Date()) - start) / (7*86400000)) - (c.shift || 0);
  return Math.max(0, Math.min(durata-1, wk)) + 1;
}

async function sbGet(q){
  const r = await fetch(`${SB_URL}/rest/v1/${q}`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
  if (!r.ok) throw new Error(`supabase ${q.split('?')[0]}: HTTP ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  const key = process.env.COACH_API_KEY;
  if (!key || (req.headers.authorization || '') !== 'Bearer ' + key) { res.status(401).json({ error: 'unauthorized' }); return; }
  if (!SB_URL || !SB_KEY) { res.status(500).json({ error: 'supabase env missing' }); return; }
  try {
    const [attiv, schedRows, cfgRows, coachRows, progs, weeks, sess, blocchi] = await Promise.all([
      sbGet('attivita?select=*'),
      sbGet('schedule_giorno?select=giorno,ordinamento,disciplina&order=ordinamento'),
      sbGet('allenamenti_cfg?select=*'),
      sbGet('coach_config?select=*'),
      sbGet('programma?select=*'),
      sbGet('programma_week?select=*&order=ordinamento'),
      sbGet('programma_sessione?select=*&order=ordinamento'),
      sbGet('programma_blocco?select=*&order=ordinamento'),
    ]);
    // attivita: colonne + campi jsonb `extra` (zone FC, ecc.) appiattiti
    const A = (attiv || []).map(r => ({ ...r, ...(r.extra || {}) }));
    const schedule = {}; (schedRows || []).forEach(r => { (schedule[r.giorno] = schedule[r.giorno] || []).push(r.disciplina); });
    const allenCfg = {}; (cfgRows || []).forEach(r => { allenCfg[r.programma_key] = { start: r.start_date, shift: r.shift }; });
    const coachConfig = (coachRows && coachRows[0]) || {};

    const tot = {};
    A.forEach(a => { const d = a.disciplina; (tot[d] = tot[d] || { n: 0, ore: 0, km: 0 }); tot[d].n++; tot[d].ore += num(a.durata_min)/60; tot[d].km += num(a.distanza_km); });
    Object.values(tot).forEach(t => { t.ore = Math.round(t.ore*10)/10; t.km = Math.round(t.km*10)/10; });

    const wkmap = {}; A.forEach(a => { if (a.anno_sett) wkmap[a.anno_sett] = (wkmap[a.anno_sett]||0) + num(a.carico); });
    const carico_settimanale = Object.keys(wkmap).sort().slice(-14).map(w => ({ settimana: w, carico: Math.round(wkmap[w]) }));

    const z = [0,0,0,0,0,0]; A.forEach(a => { for (let i=1;i<=5;i++) z[i] += num(a['zona'+i+'_min']); });
    const zt = z.reduce((x,y)=>x+y,0)||1;
    const zone = { Z1: Math.round(z[1]/zt*100), Z2: Math.round(z[2]/zt*100), Z3: Math.round(z[3]/zt*100), Z4: Math.round(z[4]/zt*100), Z5: Math.round(z[5]/zt*100) };

    const byDate = A.filter(a => a.data).sort((x,y) => x.data < y.data ? -1 : 1);
    const last = [...byDate].reverse().find(a => num(a.ctl) > 0);
    const ctl = last ? Math.round(num(last.ctl)) : null, atl = last ? Math.round(num(last.atl)) : null;
    const ultime_attivita = byDate.slice(-30).reverse().map(a => ({
      data: a.data, sport: a.disciplina, nome: a.nome,
      km: num(a.distanza_km) || undefined, min: Math.round(num(a.durata_min)),
      passo: a.passo_corsa_min_km || a.passo_nuoto_min_100m || undefined,
      kmh: a.velocita_bici_kmh || undefined, fc: a.fc_media || undefined, carico: a.carico || undefined
    }));

    // piano settimanale programmato (dallo schedule impostato in app)
    const piano_settimana = {};
    for (const wd of ['lun','mar','mer','gio','ven','sab','dom']) {
      const v = (schedule[wd] || []).filter(x => x && x !== 'riposo');
      piano_settimana[WD[wd]] = v.length ? v.map(id => SCHED_LBL[id] || id).join(' + ') : 'Riposo';
    }

    // SCHEDE COMPLETE: tutte le settimane di forza/tri, con quella corrente marcata
    const durataOf = k => { const p = (progs || []).find(x => x.key === k); return (p && p.durata) || (k === 'forza' ? 8 : 4); };
    function buildSchede(key){
      const tot = durataOf(key);
      const wkNow = progWeek(key, allenCfg, tot);
      const ws = (weeks || []).filter(w => w.programma_key === key);
      const mkBlocchi = sid => (blocchi || []).filter(b => b.sessione_id === sid).map(b => ({ nome: b.nome, righe: b.righe }));
      const settimane = ws.map(w => {
        const ss = (sess || []).filter(x => x.week_id === w.id);
        const n = w.ordinamento + 1;
        const base = { settimana: n, titolo: w.titolo, note: w.note || undefined, corrente: n === wkNow };
        if (ss.length === 1 && ss[0].disc == null) return { ...base, blocchi: mkBlocchi(ss[0].id) };
        return { ...base, sessioni: ss.map(s => ({ disc: s.disc, nome: s.nome || undefined, blocchi: mkBlocchi(s.id) })) };
      });
      return { settimana_corrente: wkNow, totale_settimane: tot, settimane };
    }
    const schede = { forza: buildSchede('forza'), triathlon: buildSchede('tri') };

    // settimana in corso: dove siamo adesso, cosa era già dovuto vs cosa resta, cosa è stato fatto
    const ORD = ['lun','mar','mer','gio','ven','sab','dom'];
    const now = new Date();
    const dow = (now.getDay()+6)%7;               // 0 = lunedì
    const mondayStr = mondayOf(now).toISOString().slice(0,10);
    const piano_gia_dovuto = {}, piano_ancora_da_fare = {};
    ORD.forEach((wd,i) => { (i <= dow ? piano_gia_dovuto : piano_ancora_da_fare)[WD[wd]] = piano_settimana[WD[wd]]; });
    const settimana_in_corso = {
      oggi: WD[ORD[dow]] + ' ' + now.toISOString().slice(0,10),
      giorno_n_su_7: dow + 1,
      giorni_ancora_da_giocare: 6 - dow,
      settimana_completata: dow === 6,
      settimana_forza: schede.forza.settimana_corrente,
      settimana_triathlon: schede.triathlon.settimana_corrente,
      piano_gia_dovuto,
      piano_ancora_da_fare,
      attivita_di_questa_settimana: byDate.filter(a => a.data >= mondayStr).reverse().map(a => ({
        data: a.data, sport: a.disciplina, nome: a.nome,
        km: num(a.distanza_km) || undefined, min: Math.round(num(a.durata_min)), carico: a.carico || undefined
      }))
    };

    res.status(200).json({
      atleta: 'Nicholas',
      obiettivo: (coachConfig && coachConfig.obiettivo) || 'Non impostato — preparazione generale (chiedi all\'atleta l\'obiettivo attuale se serve).',
      note_atleta: (coachConfig && coachConfig.note) || undefined,
      aggiornato: new Date().toISOString().slice(0,10),
      totali_per_disciplina: tot,
      carico_settimanale,
      distribuzione_zone_fc_perc: zone,
      fitness_ctl: ctl, fatica_atl: atl, forma_tsb: (ctl != null && atl != null) ? ctl - atl : null,
      piano_settimana_programmato: piano_settimana,
      settimana_in_corso,
      schede,
      ultime_attivita,
      note: 'Distanze in km, durate in minuti. CTL=fitness, ATL=fatica, TSB=forma. `schede` = i programmi completi (forza + triathlon): la settimana in cui si trova l\'atleta ORA ha `corrente: true` (usala per sapere cosa deve allenare questa settimana). `piano_settimana_programmato` = i giorni pianificati; `ultime_attivita` = ciò che ha davvero svolto. IMPORTANTE: se settimana_in_corso.settimana_completata = false la settimana NON è finita: NON dare giudizi finali e NON segnare come "mancati" gli allenamenti in piano_ancora_da_fare. Confronta solo piano_gia_dovuto con attivita_di_questa_settimana. I dati arrivano da intervals.icu: se l\'atleta cita un allenamento che non vedi, potrebbe non essere ancora sincronizzato — diglielo invece di assumere che non l\'abbia fatto.'
    });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
