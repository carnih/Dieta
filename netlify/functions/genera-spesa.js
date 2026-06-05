exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { nicholasData, noemiData, scheduleData, historyData } = JSON.parse(event.body);

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'ANTHROPIC_API_KEY non configurata su Netlify' }) };
    }

    const prompt = buildPrompt(nicholasData, noemiData, scheduleData, historyData || []);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: 'Anthropic error: ' + errText }) };
    }

    const data = await response.json();
    const rawText = data.content[0].text.trim();

    // Estrai JSON anche se il modello lo wrappa in markdown
    let jsonStr = rawText;
    const mdMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (mdMatch) jsonStr = mdMatch[1].trim();
    else {
      const objMatch = rawText.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];
    }

    const result = JSON.parse(jsonStr);

    // Assicura che tutte le categorie esistano
    const CATS = ['cereali','dispensa','proteine','verdure','frutta','surgelati','casa','gatto','coniglio'];
    CATS.forEach(c => { if (!Array.isArray(result[c])) result[c] = []; });

    return {
      statusCode: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };

  } catch (e) {
    console.error('genera-spesa error:', e);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: e.message }) };
  }
};

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
}

// ─────────────────────────────────────────────
//  COSTRUZIONE PROMPT
// ─────────────────────────────────────────────
function buildPrompt(nicholas, noemi, schedule, history) {
  const DAYS     = ['lun','mar','mer','gio','ven','sab','dom'];
  const DAY_FULL = { lun:'Lunedì', mar:'Martedì', mer:'Mercoledì', gio:'Giovedì', ven:'Venerdì', sab:'Sabato', dom:'Domenica' };
  const SCHED_OPTS = [
    {id:'corsa',     label:'Corsa',      diet:'corsa'},
    {id:'bici',      label:'Bici',       diet:'bici'},
    {id:'palestra',  label:'Palestra',   diet:'palestra'},
    {id:'nuoto',     label:'Nuoto',      diet:'palestra'},
    {id:'padel',     label:'Padel',      diet:'palestra'},
    {id:'combinato', label:'Combinato',  diet:'combinato'},
    {id:'riposo',    label:'Riposo',     diet:'riposo'},
  ];

  // ── Nicholas ──
  let nicBlock = 'PIANO NICHOLAS (questa settimana):\n';
  DAYS.forEach(wd => {
    const schedId  = (schedule && schedule[wd]) || 'riposo';
    const sOpt     = SCHED_OPTS.find(o => o.id === schedId) || SCHED_OPTS[6];
    const day      = (nicholas.days || []).find(d => d.id === sOpt.diet);
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
      if (day.integ.pre)  nicBlock += `  [Integratori] Pre: ${day.integ.pre}\n`;
      if (day.integ.post) nicBlock += `  [Integratori] Post: ${day.integ.post}\n`;
      if (day.integ.multi) day.integ.multi.forEach(r => nicBlock += `  [Integratori] ${r.tag}: ${r.v}\n`);
    }
  });

  // ── Noemi ──
  const MEALS    = ['colazione','spuntino','pranzo','merenda','cena'];
  const base     = noemi.base || {};
  const planData = noemi.plan || {};
  let noemiBlock = '\nPIANO NOEMI — vegetariana (questa settimana):\n';

  DAYS.forEach(wd => {
    const dp = planData[wd] || {};
    noemiBlock += `\n${DAY_FULL[wd]}:\n`;
    MEALS.forEach(mk => {
      const meal = base[mk];
      if (!meal) return;
      if (dp[mk + '_free']) { noemiBlock += `  [${meal.nome}] PASTO LIBERO\n`; return; }
      noemiBlock += `  [${meal.nome}]\n`;
      (meal.slots || []).forEach(s => {
        const val = (dp[s.key] !== undefined && dp[s.key] !== '') ? dp[s.key] : (s.opts || [])[0];
        if (val && val !== '— niente') noemiBlock += `    · (${s.cat}) ${val}\n`;
      });
      (meal.fixed || []).forEach(f => { noemiBlock += `    · (${f.cat}) ${f.v} [fisso]\n`; });
      const note = dp[mk + '_note'];
      if (note) noemiBlock += `    📝 Ricetta: ${note}\n`;
    });
  });

  // ── Storico ──
  let histBlock = '';
  if (history && history.length > 0) {
    histBlock = '\nSTORICO ULTIME LISTE:\n';
    history.slice(-6).forEach(h => {
      histBlock += `\n[${h.date}]\n`;
      Object.entries(h.items || {}).forEach(([cat, items]) => {
        if (items && items.length) histBlock += `  ${cat}: ${items.map(i => i.t).join(', ')}\n`;
      });
    });
    histBlock += '\n→ Voci che compaiono spesso nello storico (fieno, cibo gatto, ghiaccioli, prodotti casa…) INCLUDILE anche se non derivano dalla dieta settimanale.\n';
  }

  return `Sei un assistente italiano per la spesa alimentare. Analizza i piani dieta di Nicholas e Noemi e produci una lista della spesa settimanale intelligente.

${nicBlock}
${noemiBlock}
${histBlock}

CATEGORIE (chiavi JSON esatte):
  cereali   → pasta, riso, pane, gallette, biscotti, fette biscottate, patate, gnocchi, avena/fiocchi
  dispensa  → olio EVO, marmellata, miele, parmigiano, passata/sugo, burro arachidi, frutta secca, cioccolato fondente, integratori sportivi (creatina/BCAA/carnitina/sali), barrette, cacao
  proteine  → carne, pesce, uova, formaggi, yogurt greco/magro, latte, legumi, tofu, affettati, budino proteico
  verdure   → verdure fresche
  frutta    → frutta fresca
  surgelati → surgelati
  casa      → prodotti pulizia/igiene
  gatto     → cibo/lettiera gatto
  coniglio  → fieno/cibo coniglio

REGOLE IMPORTANTI:
1. Proteine Nicholas: aggrega per tipo con grammature e pasti. Es: "Pollo / Tacchino (150g pranzo · 250g cena)" invece di voci separate per ogni giorno.
2. Se entrambi usano lo stesso ingrediente → owners: ["nicholas","noemi"], una sola voce, non duplicare.
3. Raggruppa intelligente: "riso basmati" + "riso venere" → "Riso (basmati / venere)".
4. Scelte multiple Nicholas: includi solo le varianti principali, non elencare tutto.
5. Integratori (BCAA, creatina, carnitina, sali) → categoria "dispensa", owners: ["nicholas"].
6. NON includere: acqua, sale, pepe, aromi generici, aceto.
7. Rispondi SOLO con JSON valido, zero testo prima o dopo.

FORMATO OUTPUT (tutte le 9 categorie sempre presenti, anche se vuote []):
{
  "cereali":   [{"t": "Pasta",                                  "owners": ["nicholas","noemi"]}, ...],
  "dispensa":  [{"t": "Creatina",                               "owners": ["nicholas"]}, ...],
  "proteine":  [{"t": "Pollo / Tacchino (150g pranzo · 250g cena)", "owners": ["nicholas"]}, ...],
  "verdure":   [],
  "frutta":    [],
  "surgelati": [],
  "casa":      [],
  "gatto":     [],
  "coniglio":  []
}`;
}
