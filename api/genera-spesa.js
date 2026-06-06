module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { nicholasData, noemiData, scheduleData, historyData, categoriesData, pantryData } = body;

    const KEY = process.env.ANTHROPIC_API_KEY;
    if (!KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY mancante su Vercel' });

    // categorie valide (fallback alle default se non passate)
    const cats = (Array.isArray(categoriesData) && categoriesData.length)
      ? categoriesData
      : [
          {key:'cereali',label:'🌾 Cereali'},{key:'dispensa',label:'🥫 Dispensa'},
          {key:'proteine',label:'🥩 Proteine'},{key:'verdure',label:'🥦 Verdure'},
          {key:'frutta',label:'🍓 Frutta'},{key:'surgelati',label:'❄️ Surgelati'},
          {key:'integratori',label:'💊 Integratori'},{key:'casa',label:'🧴 Casa'},
          {key:'gatto',label:'🐈 Gatto'},{key:'coniglio',label:'🐰 Coniglio'},
        ];

    const prompt = buildPrompt(nicholasData, noemiData, scheduleData, historyData || [], cats, pantryData || []);
    console.log('Prompt length:', prompt.length, 'chars');

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 4096,
        system: 'Rispondi SOLO con JSON valido, senza testo prima o dopo, senza markdown.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    console.log('Anthropic status:', aiRes.status);
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return res.status(502).json({ error: 'Anthropic ' + aiRes.status + ': ' + errText.slice(0, 300) });
    }

    const data = await aiRes.json();
    const rawText = data.content[0].text.trim();
    console.log('Raw response length:', rawText.length);

    let jsonStr = rawText;
    const mdMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (mdMatch) jsonStr = mdMatch[1].trim();
    else { const m = rawText.match(/\{[\s\S]*\}/); if (m) jsonStr = m[0]; }

    const result = JSON.parse(jsonStr);
    console.log('Parsed result keys:', Object.keys(result));
    console.log('Sample item:', JSON.stringify((Object.values(result).find(v=>Array.isArray(v)&&v.length)||[])[0]));

    // Normalizza su TUTTE le chiavi restituite (categorie dinamiche/custom incluse)
    const out = {};
    Object.keys(result || {}).forEach(c => {
      if (!Array.isArray(result[c])) return;
      out[c] = result[c].map(item => {
        if (!item) return null;
        if (typeof item === 'string') return { t: item, owners: [] };
        const t = item.t || item.nome || item.name || item.item || item.prodotto || item.voce
                  || Object.entries(item).find(([k,v]) => typeof v === 'string' && v.length > 1)?.[1]
                  || '';
        const owners = Array.isArray(item.owners) ? item.owners : [];
        return t ? { t: String(t), owners } : null;
      }).filter(Boolean);
    });

    return res.status(200).json(out);

  } catch (e) {
    console.error('genera-spesa error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};

// ─────────────────────────────────────────────
//  PROMPT (ricco)
// ─────────────────────────────────────────────
function buildPrompt(nicholas, noemi, schedule, history, cats, pantryData) {
  const DAYS = ['lun','mar','mer','gio','ven','sab','dom'];
  const DLBL = { lun:'Lun', mar:'Mar', mer:'Mer', gio:'Gio', ven:'Ven', sab:'Sab', dom:'Dom' };
  const SCHED_OPTS = [
    {id:'corsa',diet:'corsa',label:'Corsa'},{id:'bici',diet:'bici',label:'Bici'},
    {id:'palestra',diet:'palestra',label:'Palestra'},{id:'nuoto',diet:'palestra',label:'Nuoto'},
    {id:'padel',diet:'palestra',label:'Padel'},{id:'combinato',diet:'combinato',label:'Combinato'},
    {id:'riposo',diet:'riposo',label:'Riposo'},
  ];
  const getOpt = wd => SCHED_OPTS.find(o=>o.id===((schedule&&schedule[wd])||'riposo'))||SCHED_OPTS[6];

  // Quante volte a settimana ricorre ogni tipo di dieta (per dosare le quantità)
  const dietCount = {};
  DAYS.forEach(wd => { const d=getOpt(wd).diet; dietCount[d]=(dietCount[d]||0)+1; });
  const nicWeek = DAYS.map(wd => `${DLBL[wd]}:${getOpt(wd).label}`).join(' ');

  // Diete uniche Nicholas — dettaglio pasti con TUTTE le alternative (servono i grammi)
  const usedIds = [...new Set(DAYS.map(wd => getOpt(wd).diet))];
  let nicDiets = '';
  usedIds.forEach(id => {
    const day = (nicholas.days||[]).find(d=>d.id===id); if(!day) return;
    nicDiets += `\n[${day.label||id}] (×${dietCount[id]}/sett)\n`;
    (day.pasti||[]).forEach(p => {
      nicDiets += `  ${p.nome}:\n`;
      (p.items||[]).forEach(it => {
        if(it.v)    nicDiets += `    - (${it.cat}) ${it.v}\n`;
        if(it.alts) nicDiets += `    - (${it.cat}) opzioni: ${it.alts.join(' | ')}\n`;
      });
    });
    if(day.integ){
      const parts = [];
      if(day.integ.pre)  parts.push('pre: '+day.integ.pre);
      if(day.integ.post) parts.push('post: '+day.integ.post);
      if(day.integ.multi) day.integ.multi.forEach(r=>parts.push(r.tag+': '+r.v));
      if(parts.length) nicDiets += `  Integratori: ${parts.join(', ')}\n`;
    }
  });

  // Noemi — scelte uniche + ricette scritte a mano
  const noemiSelections = new Set();
  const noemiNotes = [];
  const base = noemi.base||{}, planData = noemi.plan||{};
  const MEALS = ['colazione','spuntino','pranzo','merenda','cena'];
  DAYS.forEach(wd => {
    const dp = planData[wd]||{};
    MEALS.forEach(mk => {
      const meal = base[mk]; if(!meal) return;
      if(dp[mk+'_free']) return;
      (meal.slots||[]).forEach(s => {
        const val = (dp[s.key]!==undefined&&dp[s.key]!=='') ? dp[s.key] : (s.opts||[])[0];
        if(val && val!=='— niente') noemiSelections.add(val);
      });
      (meal.fixed||[]).forEach(f => noemiSelections.add(f.v));
      const note = dp[mk+'_note'];
      if(note) noemiNotes.push(note);
    });
  });
  const noemiBlock = [...noemiSelections].join(' / ')
    + (noemiNotes.length ? '\nRICETTE scritte a mano (estrai gli ingredienti!): '+noemiNotes.join(' ; ') : '');

  // Storico — frequenza voci negli ultimi snapshot
  let histLine = '';
  if(history && history.length>0){
    const allItems = history.slice(-6).flatMap(h=>Object.values(h.items||{}).flat().map(i=>i&&i.t).filter(Boolean));
    const freq = {};
    allItems.forEach(t=>{ const k=t.toLowerCase(); freq[k]=(freq[k]||0)+1; });
    const recurring = Object.entries(freq).filter(([,n])=>n>=2)
      .sort((a,b)=>b[1]-a[1]).map(([t,n])=>`${t} (${n}x)`);
    if(recurring.length) histLine = '\nVOCI RICORRENTI nello storico: '+recurring.join(', ');
  }

  // Categorie valide (chiavi reali, incluse custom/rinominate)
  const catLines = cats.map(c=>`  "${c.key}" = ${c.label}`).join('\n');

  return `Sei l'assistente spesa di Nicholas e Noemi. Genera la lista della spesa settimanale COMPLETA.
Rispondi SOLO con JSON valido: un oggetto con le chiavi categoria, ogni valore è un array di {"t":"...","owners":[...]}.

═══ DIETA NICHOLAS ═══
Settimana: ${nicWeek}
${nicDiets}
═══ DIETA NOEMI (vegetariana) ═══
${noemiBlock}
${histLine}

═══ CATEGORIE VALIDE (usa SOLO queste chiavi come chiavi JSON) ═══
${catLines}

═══ REGOLE ═══
1. Leggi ENTRAMBE le diete (Nicholas E Noemi) e fai un merge intelligente in un'unica lista.
2. ROUTING per reparto: ragiona su DOVE si trova fisicamente l'alimento al supermercato,
   non sulla sua funzione nutrizionale. Es: le PATATE/zucca/legumi freschi stanno nell'ortofrutta
   → "verdure", NON tra i cereali. Linee guida:
   - macelleria → carne (pollo, tacchino, carne bianca/rossa, bresaola fresca…)
   - pescheria → pesce e molluschi (merluzzo, orata, salmone, tonno fresco, gamberi, polpo…)
   - latticini → yogurt, latte, formaggi, ricotta, mozzarella, burro…
   - banco → uova, affettati/salumi, tofu, ravioli/tortellini freschi, hummus
   - panetteria → pane, pane integrale, focaccia, pane di segale
   - cereali → pasta, riso, gallette, biscotti, fette biscottate, avena, cous cous
   - verdure → TUTTO l'ortofrutta verdura: insalata, pomodori, zucchine, PATATE, patate dolci, zucca, carote…
   - frutta → frutta fresca, banane, spremute
   - dispensa → SOLO lunga conservazione: olio, marmellata, miele, passata, parmigiano, tonno/legumi
     in scatola, frutta secca, cioccolato, barrette, cacao
   - integratori → creatina/BCAA/carnitina/sali/maltodestrine/proteine in polvere (owners ["nicholas"])
   - surgelati → solo se esplicitamente surgelato
   Se un alimento è ambiguo, scegli il reparto dove lo prenderesti davvero al supermercato.
3. GRAMMATURE: indicale SOLO per la parte proteica/secondi di NICHOLAS (macelleria e pescheria),
   per ogni TIPO con i grammi di pranzo E cena.
   Esempio: {"t":"Carne bianca / pollo / tacchino (150g pranzo · 250g cena)","owners":["nicholas"]}
4. Tutto il RESTO (pane, carboidrati, frutta, verdura, latticini, condimenti, integratori, voci Noemi)
   → SENZA grammature, solo il nome (es. "Pane integrale", "Pasta", "Yogurt greco").
5. NOEMI (vegetariana): includi gli ingredienti delle sue scelte E quelli estratti dalle RICETTE
   scritte a mano. NON dimenticare la sua dieta: deve comparire roba sua.
6. MERGE: alimento per ENTRAMBI (es. pasta, riso, yogurt, verdura, frutta, olio, uova, pane)
   → UNA SOLA voce con owners ["nicholas","noemi"]. Non duplicare.
7. owners: solo Nicholas→["nicholas"], solo Noemi→["noemi"], entrambi→["nicholas","noemi"].
8. VOCI RICORRENTI dello storico che NON derivano dalle diete (es. fieno coniglio, lettiera gatto,
   ghiaccioli, detersivi) → riproponile nella categoria giusta (owners []).
9. NON includere acqua, sale, pepe, aromi.

Esempio output (chiavi e voci illustrative):
{"macelleria":[{"t":"Carne bianca / pollo / tacchino (150g pranzo · 250g cena)","owners":["nicholas"]}],"pescheria":[{"t":"Pesce bianco merluzzo/orata/branzino (150g pranzo · 250g cena)","owners":["nicholas"]}],"banco":[{"t":"Tofu","owners":["noemi"]},{"t":"Uova","owners":["nicholas","noemi"]}],"latticini":[{"t":"Yogurt greco","owners":["nicholas","noemi"]}],"panetteria":[{"t":"Pane integrale","owners":["nicholas","noemi"]}],"cereali":[{"t":"Pasta","owners":["nicholas","noemi"]}],"coniglio":[{"t":"Fieno","owners":[]}]}`;
}
