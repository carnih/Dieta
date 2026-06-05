const https = require('https');

// Helper HTTPS POST senza fetch (compatibile con qualsiasi versione Node)
function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname, path, method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors(), body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { nicholasData, noemiData, scheduleData, historyData } = JSON.parse(event.body);
    const KEY = process.env.ANTHROPIC_API_KEY;
    if (!KEY) return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: 'ANTHROPIC_API_KEY mancante su Netlify' }) };

    const prompt = buildPrompt(nicholasData, noemiData, scheduleData, historyData || []);

    const resp = await httpsPost(
      'api.anthropic.com',
      '/v1/messages',
      {
        'Content-Type': 'application/json',
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01'
      },
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      }
    );

    if (resp.status !== 200) {
      return { statusCode: 502, headers: cors(), body: JSON.stringify({ error: 'Anthropic error ' + resp.status + ': ' + resp.body }) };
    }

    const data = JSON.parse(resp.body);
    const rawText = data.content[0].text.trim();

    // Estrai JSON anche se wrappato in markdown
    let jsonStr = rawText;
    const mdMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (mdMatch) jsonStr = mdMatch[1].trim();
    else { const m = rawText.match(/\{[\s\S]*\}/); if (m) jsonStr = m[0]; }

    const result = JSON.parse(jsonStr);
    const CATS = ['cereali','dispensa','proteine','verdure','frutta','surgelati','casa','gatto','coniglio'];
    CATS.forEach(c => { if (!Array.isArray(result[c])) result[c] = []; });

    return { statusCode: 200, headers: { ...cors(), 'Content-Type': 'application/json' }, body: JSON.stringify(result) };

  } catch (e) {
    console.error('genera-spesa:', e);
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: e.message }) };
  }
};

function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }; }

// ─────────────────────────────────────────────
//  PROMPT
// ─────────────────────────────────────────────
function buildPrompt(nicholas, noemi, schedule, history) {
  const DAYS     = ['lun','mar','mer','gio','ven','sab','dom'];
  const DAY_FULL = { lun:'Lunedì', mar:'Martedì', mer:'Mercoledì', gio:'Giovedì', ven:'Venerdì', sab:'Sabato', dom:'Domenica' };
  const SCHED_OPTS = [
    {id:'corsa',label:'Corsa',diet:'corsa'},{id:'bici',label:'Bici',diet:'bici'},
    {id:'palestra',label:'Palestra',diet:'palestra'},{id:'nuoto',label:'Nuoto',diet:'palestra'},
    {id:'padel',label:'Padel',diet:'palestra'},{id:'combinato',label:'Combinato',diet:'combinato'},
    {id:'riposo',label:'Riposo',diet:'riposo'},
  ];

  let nicBlock = 'PIANO NICHOLAS (questa settimana):\n';
  DAYS.forEach(wd => {
    const sOpt = SCHED_OPTS.find(o => o.id === ((schedule && schedule[wd]) || 'riposo')) || SCHED_OPTS[6];
    const day  = (nicholas.days || []).find(d => d.id === sOpt.diet);
    if (!day) return;
    nicBlock += `\n${DAY_FULL[wd]} — ${sOpt.label}:\n`;
    (day.pasti || []).forEach(p => {
      nicBlock += `  [${p.nome}]\n`;
      (p.items || []).forEach(it => {
        if (it.v)    nicBlock += `    · (${it.cat}) ${it.v}\n`;
        if (it.alts) nicBlock += `    · (${it.cat}) scelta tra: ${it.alts.join(' | ')}\n`;
      });
    });
    if (day.integ) {
      if (day.integ.pre)   nicBlock += `  [Integratori] Pre: ${day.integ.pre}\n`;
      if (day.integ.post)  nicBlock += `  [Integratori] Post: ${day.integ.post}\n`;
      if (day.integ.multi) day.integ.multi.forEach(r => nicBlock += `  [Integratori] ${r.tag}: ${r.v}\n`);
    }
  });

  const MEALS    = ['colazione','spuntino','pranzo','merenda','cena'];
  const base     = noemi.base || {};
  const planData = noemi.plan || {};
  let noemiBlock = '\nPIANO NOEMI — vegetariana (questa settimana):\n';
  DAYS.forEach(wd => {
    const dp = planData[wd] || {};
    noemiBlock += `\n${DAY_FULL[wd]}:\n`;
    MEALS.forEach(mk => {
      const meal = base[mk]; if (!meal) return;
      if (dp[mk+'_free']) { noemiBlock += `  [${meal.nome}] PASTO LIBERO\n`; return; }
      noemiBlock += `  [${meal.nome}]\n`;
      (meal.slots || []).forEach(s => {
        const val = (dp[s.key] !== undefined && dp[s.key] !== '') ? dp[s.key] : (s.opts||[])[0];
        if (val && val !== '— niente') noemiBlock += `    · (${s.cat}) ${val}\n`;
      });
      (meal.fixed || []).forEach(f => noemiBlock += `    · (${f.cat}) ${f.v} [fisso]\n`);
      const note = dp[mk+'_note'];
      if (note) noemiBlock += `    📝 Ricetta: ${note}\n`;
    });
  });

  let histBlock = '';
  if (history && history.length > 0) {
    histBlock = '\nSTORICO ULTIME LISTE:\n';
    history.slice(-6).forEach(h => {
      histBlock += `\n[${h.date}]\n`;
      Object.entries(h.items || {}).forEach(([cat, items]) => {
        if (items && items.length) histBlock += `  ${cat}: ${items.map(i=>i.t).join(', ')}\n`;
      });
    });
    histBlock += '\n→ Voci ricorrenti nello storico NON da dieta (es. fieno, cibo gatto, ghiaccioli…): includile nelle categorie appropriate.\n';
  }

  // Ottimizzazione token: per Nicholas manda solo i tipi di giornata UNICI usati questa settimana
  const usedDietIds = [...new Set(DAYS.map(wd => {
    const sOpt = SCHED_OPTS.find(o => o.id === ((schedule && schedule[wd]) || 'riposo')) || SCHED_OPTS[6];
    return sOpt.diet;
  }))];
  let nicDiets = '\nDIETE NICHOLAS (tipi usati questa settimana):\n';
  usedDietIds.forEach(dietId => {
    const day = (nicholas.days || []).find(d => d.id === dietId);
    if (!day) return;
    nicDiets += `\n[Tipo: ${day.label || dietId}]\n`;
    (day.pasti || []).forEach(p => {
      nicDiets += `  ${p.nome}:\n`;
      (p.items || []).forEach(it => {
        if (it.v)    nicDiets += `    · (${it.cat}) ${it.v}\n`;
        if (it.alts) nicDiets += `    · (${it.cat}) scelta: ${it.alts.slice(0,3).join(' | ')}${it.alts.length>3?' …':''}\n`;
      });
    });
  });

  return `Genera lista spesa settimanale per Nicholas e Noemi. Rispondi SOLO con JSON valido.

${nicBlock}
${nicDiets}
${noemiBlock}
${histBlock}

CATEGORIE JSON (10 chiavi esatte):
  cereali      → pasta, riso, pane, gallette, biscotti, patate, avena
  dispensa     → olio EVO, marmellata, miele, parmigiano/grana, passata, burro arachidi, frutta secca, cioccolato, barrette, cacao
  proteine     → carne, pesce (raggruppa tutto il pesce in 1-2 voci), uova, formaggi, yogurt, latte, legumi, tofu, affettati, budino
  verdure      → verdure fresche
  frutta       → frutta fresca
  surgelati    → surgelati
  integratori  → creatina, BCAA, carnitina, sali minerali, proteine in polvere — tutti owners:["nicholas"]
  casa         → pulizia/igiene
  gatto        → cibo/lettiera gatto
  coniglio     → fieno/cibo coniglio

REGOLE:
1. Proteine Nicholas: aggrega tipo "Pollo / Tacchino (150g pranzo · 250g cena)" — non elencare ogni giorno.
2. Pesce: massimo 1-2 voci raggruppate es. "Pesce bianco (merluzzo/orata/branzino)" + "Salmone / Pesce spada" se presente.
3. Parmigiano/grana → dispensa (è un condimento).
4. Condiviso da entrambi → owners:["nicholas","noemi"], una voce sola.
5. Storico: aggiungi voci ricorrenti non da dieta nelle categorie giuste.
6. NON includere acqua, sale, pepe, aromi.

OUTPUT (tutte le 10 categorie sempre presenti, anche vuote):
{"cereali":[],"dispensa":[],"proteine":[],"verdure":[],"frutta":[],"surgelati":[],"integratori":[],"casa":[],"gatto":[],"coniglio":[]}`;
}
