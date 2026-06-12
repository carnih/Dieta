// Netlify Function: espone un riassunto AGGIORNATO degli allenamenti per il GPT personalizzato.
// Nessun costo AI: serve solo dati (il "cervello" e' ChatGPT). Protetta da COACH_API_KEY.
// Env richieste su Netlify: COACH_API_KEY, FB_EMAIL, FB_PASSWORD (FB_APIKEY/FB_DB hanno default pubblici).
const FB_APIKEY = process.env.FB_APIKEY || 'AIzaSyAIhOcx7IPpTIRjnbbmjhKZ2bWRAjt2JT4';
const FB_DB     = process.env.FB_DB     || 'https://dieta-b7804-default-rtdb.europe-west1.firebasedatabase.app';
const num = v => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };

exports.handler = async (event) => {
  const key = process.env.COACH_API_KEY;
  const auth = event.headers.authorization || event.headers.Authorization || '';
  if (!key || auth !== 'Bearer ' + key) return { statusCode: 401, body: '{"error":"unauthorized"}' };
  try {
    const si = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FB_APIKEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.FB_EMAIL, password: process.env.FB_PASSWORD, returnSecureToken: true })
    }).then(r => r.json());
    if (!si.idToken) return { statusCode: 500, body: '{"error":"firebase auth failed"}' };
    const obj = await fetch(`${FB_DB}/training/activities.json?auth=${si.idToken}`).then(r => r.json());
    const A = obj ? Object.values(obj) : [];

    const tot = {};
    A.forEach(a => { const d = a.disciplina; (tot[d] = tot[d] || { n: 0, ore: 0, km: 0 }); tot[d].n++; tot[d].ore += num(a.durata_min) / 60; tot[d].km += num(a.distanza_km); });
    Object.values(tot).forEach(t => { t.ore = Math.round(t.ore * 10) / 10; t.km = Math.round(t.km * 10) / 10; });

    const wk = {}; A.forEach(a => { if (a.anno_sett) wk[a.anno_sett] = (wk[a.anno_sett] || 0) + num(a.carico); });
    const carico_settimanale = Object.keys(wk).sort().slice(-14).map(w => ({ settimana: w, carico: Math.round(wk[w]) }));

    const z = [0, 0, 0, 0, 0, 0]; A.forEach(a => { for (let i = 1; i <= 5; i++) z[i] += num(a['zona' + i + '_min']); });
    const zt = z.reduce((x, y) => x + y, 0) || 1;
    const zone = { Z1: Math.round(z[1] / zt * 100), Z2: Math.round(z[2] / zt * 100), Z3: Math.round(z[3] / zt * 100), Z4: Math.round(z[4] / zt * 100), Z5: Math.round(z[5] / zt * 100) };

    const byDate = A.filter(a => a.data).sort((x, y) => x.data < y.data ? -1 : 1);
    const lastCtl = [...byDate].reverse().find(a => num(a.ctl) > 0);
    const ctl = lastCtl ? Math.round(num(lastCtl.ctl)) : null;
    const atl = lastCtl ? Math.round(num(lastCtl.atl)) : null;

    const ultime_attivita = byDate.slice(-25).reverse().map(a => ({
      data: a.data, sport: a.disciplina, nome: a.nome,
      km: num(a.distanza_km) || undefined, min: Math.round(num(a.durata_min)),
      passo: a.passo_corsa_min_km || a.passo_nuoto_min_100m || undefined,
      kmh: a.velocita_bici_kmh || undefined, fc: a.fc_media || undefined, carico: a.carico || undefined
    }));

    const out = {
      atleta: 'Nicholas', obiettivo: 'Ironman 70.3 Cervia ~20 settembre 2026', coach: 'Paolo Morosini',
      ritmi_coach: { corsa_facile: '6:05-6:20/km', corsa_lunga_brick: '5:45-5:55/km', scala_sforzo: 'PE/RPE 0-10 (5-6 facile, 7-8 soglia, 8-9 ripetute)' },
      aggiornato: new Date().toISOString().slice(0, 10),
      totali_per_disciplina: tot,
      carico_settimanale,
      distribuzione_zone_fc_perc: zone,
      fitness_ctl: ctl, fatica_atl: atl, forma_tsb: (ctl != null && atl != null) ? ctl - atl : null,
      ultime_attivita,
      note: 'Distanze in km, durate in minuti. CTL=fitness, ATL=fatica, TSB=forma. Padel/forza non sono triathlon-specifici.'
    };
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(out) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
