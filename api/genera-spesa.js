const https = require('https');

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      { hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } },
      res => { let raw = ''; res.on('data', c => raw += c); res.on('end', () => resolve({ status: res.statusCode, body: raw })); }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    const { nicholasData, noemiData, scheduleData, historyData } = req.body;
    const KEY = process.env.ANTHROPIC_API_KEY;
    if (!KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY mancante su Vercel' });

    const prompt = buildPrompt(nicholasData, noemiData, scheduleData, historyData || []);

    const resp = await httpsPost(
      'api.anthropic.com', '/v1/messages',
      { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      { model: 'claude-sonnet-4-6', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }
    );

    if (resp.status !== 200) {
      return res.status(502).json({ error: 'Anthropic error ' + resp.status + ': ' + resp.body });
    }

    const data = JSON.parse(resp.body);
    const rawText = data.content[0].text.trim();

    let jsonStr = rawText;
    const mdMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (mdMatch) jsonStr = mdMatch[1].trim();
    else { const m = rawText.match(/\{[\s\S]*\}/); if (m) jsonStr = m[0]; }

    const result = JSON.parse(jsonStr);
    const CATS = ['cereali','dispensa','proteine','verdure','frutta','surgelati','integratori','casa','gatto','coniglio'];
    CATS.forEach(c => { if (!Array.isArray(result[c])) result[c] = []; });

    return res.status(200).json(result);

  } catch (e) {
    console.error('genera-spesa:', e);
    return res.status(500).json({ error: e.message });
  }
};

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

  // Piano settimana Nicholas (giorni)
  let nicBlock = 'PIANO NICHOLAS (questa settimana):\n';
  DAYS.forEach(wd => {
    const sOpt = SCHED_OPTS.find(o => o.id === ((schedule && schedule[wd]) || 'riposo')) || SCHED_OPTS[6];
    const day  = (nicholas.days || []).find(d => d.id === sOpt.diet);
    if (!day) return;
    nicBlock += `${DAY_FULL[wd]}: ${sOpt.label}\n`;
  });

  // Diete uniche usate (ottimizzazione token)
  const usedDietIds = [...new Set(DAYS.map(wd => {
    const sOpt = SCHED_OPTS.find(o => o.id === ((schedule && schedule[wd]) || 'riposo')) || SCHED_OPTS[6];
    return sOpt.diet;
  }))];
  let nicDiets = '\nDIETE NICHOLAS (dettaglio per tipo):\n';
  usedDietIds.forEach(dietId => {
    const day = (nicholas.days || []).find(d => d.id === dietId);
    if (!day) return;
    nicDiets += `\n[${day.label || dietId}]\n`;
    (day.pasti || []).forEach(p => {
      nicDiets += `  ${p.nome}:\n`;
      (p.items || []).forEach(it => {
        if (it.v)    nicDiets += `    · (${it.cat}) ${it.v}\n`;
        if (it.alts) nicDiets += `    · (${it.cat}) scelta: ${it.alts.slice(0,3).join(' | ')}${it.alts.length>3?' …':''}\n`;
      });
    });
    if (day.integ) {
      if (day.integ.pre)   nicDiets += `  Integratori pre: ${day.integ.pre}\n`;
      if (day.integ.post)  nicDiets += `  Integratori post: ${day.integ.post}\n`;
      if (day.integ.multi) day.integ.multi.forEach(r => nicDiets += `  Integratori ${r.tag}: ${r.v}\n`);
    }
  });

  // Piano Noemi
  const MEALS    = ['colazione','spuntino','pranzo','merenda','cena'];
  const base     = noemi.base || {};
  const planData = noemi.plan || {};
  let noemiBlock = '\nPIANO NOEMI — vegetariana:\n';
  DAYS.forEach(wd => {
    const dp = planData[wd] || {};
    noemiBlock += `\n${DAY_FULL[wd]}:\n`;
    MEALS.forEach(mk => {
      const meal = base[mk]; if (!meal) return;
      if (dp[mk+'_free']) { noemiBlock += `  ${meal.nome}: PASTO LIBERO\n`; return; }
      noemiBlock += `  ${meal.nome}:\n`;
      (meal.slots || []).forEach(s => {
        const val = (dp[s.key] !== undefined && dp[s.key] !== '') ? dp[s.key] : (s.opts||[])[0];
        if (val && val !== '— niente') noemiBlock += `    · ${val}\n`;
      });
      (meal.fixed || []).forEach(f => noemiBlock += `    · ${f.v}\n`);
      const note = dp[mk+'_note'];
      if (note) noemiBlock += `    📝 ${note}\n`;
    });
  });

  // Storico
  let histBlock = '';
  if (history && history.length > 0) {
    histBlock = '\nSTORICO LISTE PASSATE:\n';
    history.slice(-4).forEach(h => {
      histBlock += `[${h.date}]: `;
      const all = Object.values(h.items || {}).flat().map(i=>i.t).join(', ');
      histBlock += all + '\n';
    });
    histBlock += '→ Voci ricorrenti non da dieta (fieno, cibo gatto, ghiaccioli, prodotti casa…): includile.\n';
  }

  return `Genera lista spesa settimanale per Nicholas e Noemi. Rispondi SOLO con JSON valido, zero testo prima o dopo.

${nicBlock}
${nicDiets}
${noemiBlock}
${histBlock}

CATEGORIE (10 chiavi JSON esatte):
  cereali      → pasta, riso, pane, gallette, biscotti, patate, avena
  dispensa     → olio EVO, marmellata, miele, parmigiano/grana, passata, burro arachidi, frutta secca, cioccolato, barrette
  proteine     → carne, pesce (max 2 voci raggruppate), uova, formaggi, yogurt, latte, legumi, tofu, affettati, budino
  verdure      → verdure fresche
  frutta       → frutta fresca
  surgelati    → surgelati
  integratori  → creatina, BCAA, carnitina, sali minerali, proteine polvere — owners:["nicholas"]
  casa         → pulizia/igiene
  gatto        → cibo/lettiera gatto
  coniglio     → fieno/cibo coniglio

REGOLE:
1. Proteine Nicholas: aggrega es. "Pollo / Tacchino (150g pranzo · 250g cena)".
2. Pesce: max 2 voci es. "Pesce bianco (merluzzo/orata/branzino)" + "Salmone / Pesce spada".
3. Condiviso → owners:["nicholas","noemi"], una voce sola.
4. Storico: aggiungi voci ricorrenti non da dieta.
5. NON includere acqua, sale, pepe.

FORMAT: {"cereali":[],"dispensa":[],"proteine":[],"verdure":[],"frutta":[],"surgelati":[],"integratori":[],"casa":[],"gatto":[],"coniglio":[]}`;
}
