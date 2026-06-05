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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { nicholasData, noemiData, scheduleData, historyData } = body;

    const KEY = process.env.ANTHROPIC_API_KEY;
    if (!KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY mancante su Vercel' });

    const prompt = buildPrompt(nicholasData, noemiData, scheduleData, historyData || []);
    console.log('Prompt length:', prompt.length, 'chars');

    const resp = await httpsPost(
      'api.anthropic.com', '/v1/messages',
      { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      { model: 'claude-sonnet-4-6', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }
    );

    console.log('Anthropic status:', resp.status);
    if (resp.status !== 200) {
      return res.status(502).json({ error: 'Anthropic ' + resp.status + ': ' + resp.body.slice(0, 300) });
    }

    const data = JSON.parse(resp.body);
    const rawText = data.content[0].text.trim();
    console.log('Raw response length:', rawText.length);

    let jsonStr = rawText;
    const mdMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (mdMatch) jsonStr = mdMatch[1].trim();
    else { const m = rawText.match(/\{[\s\S]*\}/); if (m) jsonStr = m[0]; }

    const result = JSON.parse(jsonStr);
    const CATS = ['cereali','dispensa','proteine','verdure','frutta','surgelati','integratori','casa','gatto','coniglio'];
    CATS.forEach(c => { if (!Array.isArray(result[c])) result[c] = []; });

    return res.status(200).json(result);

  } catch (e) {
    console.error('genera-spesa error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};

// ─────────────────────────────────────────────
//  PROMPT COMPATTO
// ─────────────────────────────────────────────
function buildPrompt(nicholas, noemi, schedule, history) {
  const DAYS = ['lun','mar','mer','gio','ven','sab','dom'];
  const DLBL = { lun:'Lun', mar:'Mar', mer:'Mer', gio:'Gio', ven:'Ven', sab:'Sab', dom:'Dom' };
  const SCHED_OPTS = [
    {id:'corsa',diet:'corsa',label:'Corsa'},{id:'bici',diet:'bici',label:'Bici'},
    {id:'palestra',diet:'palestra',label:'Palestra'},{id:'nuoto',diet:'palestra',label:'Nuoto'},
    {id:'padel',diet:'palestra',label:'Padel'},{id:'combinato',diet:'combinato',label:'Combinato'},
    {id:'riposo',diet:'riposo',label:'Riposo'},
  ];
  const getOpt = wd => SCHED_OPTS.find(o=>o.id===((schedule&&schedule[wd])||'riposo'))||SCHED_OPTS[6];

  // Settimana Nicholas — 1 riga per giorno
  const nicWeek = DAYS.map(wd => `${DLBL[wd]}:${getOpt(wd).label}`).join(' ');

  // Diete uniche Nicholas
  const usedIds = [...new Set(DAYS.map(wd => getOpt(wd).diet))];
  let nicDiets = '';
  usedIds.forEach(id => {
    const day = (nicholas.days||[]).find(d=>d.id===id); if(!day) return;
    nicDiets += `\n[${day.label||id}]\n`;
    (day.pasti||[]).forEach(p => {
      nicDiets += ` ${p.nome}:`;
      (p.items||[]).forEach(it => {
        if(it.v) nicDiets += ` ${it.v} /`;
        if(it.alts) nicDiets += ` [scelta:${it.alts.slice(0,2).join('|')}] /`;
      });
      nicDiets += '\n';
    });
    if(day.integ){
      const parts = [];
      if(day.integ.pre)  parts.push('pre:'+day.integ.pre);
      if(day.integ.post) parts.push('post:'+day.integ.post);
      if(day.integ.multi) day.integ.multi.forEach(r=>parts.push(r.tag+':'+r.v));
      if(parts.length) nicDiets += ` Integratori: ${parts.join(', ')}\n`;
    }
  });

  // Noemi — scelte uniche (dedup per ridurre token)
  const noemiSelections = new Set();
  const noemiNotes = [];
  const base = noemi.base||{}, planData = noemi.plan||{};
  const MEALS = ['colazione','spuntino','pranzo','merenda','cena'];
  DAYS.forEach(wd => {
    const dp = planData[wd]||{};
    MEALS.forEach(mk => {
      const meal = base[mk]; if(!meal) return;
      if(dp[mk+'_free']){ noemiSelections.add('PASTO LIBERO'); return; }
      (meal.slots||[]).forEach(s => {
        const val = (dp[s.key]!==undefined&&dp[s.key]!=='') ? dp[s.key] : (s.opts||[])[0];
        if(val && val!=='— niente') noemiSelections.add(val);
      });
      (meal.fixed||[]).forEach(f => noemiSelections.add(f.v));
      const note = dp[mk+'_note'];
      if(note) noemiNotes.push(note);
    });
  });
  const noemiBlock = [...noemiSelections].join(' / ') + (noemiNotes.length ? '\nRicette: '+noemiNotes.join('; ') : '');

  // Storico compatto
  let histLine = '';
  if(history && history.length>0){
    const allItems = history.slice(-3).flatMap(h=>Object.values(h.items||{}).flat().map(i=>i.t));
    const freq = {};
    allItems.forEach(t=>{ freq[t]=(freq[t]||0)+1; });
    const recurring = Object.entries(freq).filter(([,n])=>n>=2).map(([t])=>t);
    if(recurring.length) histLine = '\nRicorrenti storico: '+recurring.join(', ');
  }

  return `Lista spesa settimanale Nicholas+Noemi. Solo JSON valido, nessun testo.

NICHOLAS settimana: ${nicWeek}
${nicDiets}
NOEMI (vegetariana) scelte settimana: ${noemiBlock}
${histLine}

CATEGORIE JSON (10 chiavi):
cereali(pasta/riso/pane/gallette/biscotti/patate/avena)
dispensa(olio/marmellata/miele/parmigiano/passata/burro-arachidi/frutta-secca/cioccolato/barrette)
proteine(carne/pesce max 2 voci raggruppate/uova/formaggi/yogurt/latte/legumi/tofu/affettati/budino)
verdure frutta surgelati
integratori(creatina/BCAA/carnitina/sali — solo nicholas)
casa gatto coniglio

REGOLE: aggrega proteine Nicholas con grammature (es."Pollo/Tacchino 150g pranzo·250g cena"). Pesce max 2 voci. Condiviso→owners:["nicholas","noemi"]. Storico ricorrenti→includi. No acqua/sale/pepe.

OUTPUT: {"cereali":[],"dispensa":[],"proteine":[],"verdure":[],"frutta":[],"surgelati":[],"integratori":[],"casa":[],"gatto":[],"coniglio":[]}`;
}
