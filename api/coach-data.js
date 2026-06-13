// Vercel Serverless Function: riassunto AGGIORNATO allenamenti per il GPT personalizzato.
// Storico + settimana + piano programmato + obiettivo (modificabile da app). Nessun costo AI.
// Env su Vercel: COACH_API_KEY, FB_EMAIL, FB_PASSWORD (FB_APIKEY/FB_DB hanno default pubblici).
const FB_APIKEY = process.env.FB_APIKEY || 'AIzaSyAIhOcx7IPpTIRjnbbmjhKZ2bWRAjt2JT4';
const FB_DB     = process.env.FB_DB     || 'https://dieta-b7804-default-rtdb.europe-west1.firebasedatabase.app';
const num = v => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };

const SCHED_LBL = { corsa:'Corsa', bici:'Bici', nuoto:'Nuoto', palestra:'Palestra', padel:'Padel', brick:'Brick', riposo:'Riposo' };
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

export default async function handler(req, res) {
  const key = process.env.COACH_API_KEY;
  if (!key || (req.headers.authorization || '') !== 'Bearer ' + key) { res.status(401).json({ error: 'unauthorized' }); return; }
  try {
    const si = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FB_APIKEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.FB_EMAIL, password: process.env.FB_PASSWORD, returnSecureToken: true })
    }).then(r => r.json());
    if (!si.idToken) { res.status(500).json({ error: 'firebase auth failed' }); return; }
    const t = si.idToken;
    const get = p => fetch(`${FB_DB}/${p}.json?auth=${t}`).then(r => r.json());
    const [obj, schedule, allenCfg, coachConfig] = await Promise.all([
      get('training/activities'), get('schedule'), get('allenamentiCfg'), get('coachConfig')
    ]);
    const A = obj ? Object.values(obj) : [];

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
      let v = schedule && schedule[wd]; if (typeof v === 'string') v = [v];
      v = (v || []).filter(x => x && x !== 'riposo');
      piano_settimana[WD[wd]] = v.length ? v.map(id => SCHED_LBL[id] || id).join(' + ') : 'Riposo';
    }
    const programmi = {
      forza: { settimana_corrente: progWeek('forza', allenCfg, 8), totale_settimane: 8 },
      triathlon: { settimana_corrente: progWeek('tri', allenCfg, 4), totale_settimane: 4 }
    };

    // settimana in corso: dove siamo adesso, cosa era già dovuto vs cosa resta, cosa è stato fatto finora
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
      programmi_in_corso: programmi,
      ultime_attivita,
      note: 'Distanze in km, durate in minuti. CTL=fitness, ATL=fatica, TSB=forma. piano_settimana_programmato = cosa l\'atleta ha pianificato; ultime_attivita = cosa ha realmente svolto. IMPORTANTE: se settimana_in_corso.settimana_completata = false, la settimana NON è finita: NON dare voti/giudizi finali e NON segnare come "mancati" gli allenamenti in piano_ancora_da_fare (sono ancora in programma). Confronta solo piano_gia_dovuto con attivita_di_questa_settimana. I dati arrivano da intervals.icu: se l\'atleta cita un allenamento che non vedi, è possibile che non sia ancora stato sincronizzato — diglielo invece di assumere che non l\'abbia fatto.'
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
