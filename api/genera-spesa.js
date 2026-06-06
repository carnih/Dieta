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

    const prompt = buildPrompt(nicholasData, noemiData, scheduleData, cats);
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
function buildPrompt(nicholas, noemi, schedule, cats) {
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

  // Categorie valide (chiavi reali, incluse custom/rinominate)
  const catLines = cats.map(c=>`  "${c.key}" = ${c.label}`).join('\n');

  return `Sei l'assistente spesa di Nicholas e Noemi. Genera la lista della spesa settimanale COMPLETA.
Rispondi SOLO con JSON valido: un oggetto con le chiavi categoria, ogni valore è un array di {"t":"...","owners":[...]}.

═══ DIETA NICHOLAS ═══
Settimana: ${nicWeek}
${nicDiets}
═══ DIETA NOEMI (vegetariana) ═══
${noemiBlock}

═══ CATEGORIE VALIDE (usa SOLO queste chiavi come chiavi JSON) ═══
${catLines}

═══ REGOLE ═══
1. Leggi ENTRAMBE le diete (Nicholas E Noemi) e fai un merge intelligente in un'unica lista.

2. PULIZIA NOMI (fondamentale): NON copiare il testo della dieta. Estrai SOLO l'alimento, nome
   breve e da lista della spesa. RIMUOVI sempre:
   - metodi di cottura: lessate, al forno, bollite, grigliate, in padella, cotte, crude…
   - preparazioni e condimenti accessori: "+ sugo al pomodoro", "con olio", "velo di miele"…
   - quantità/grammi (TRANNE le grammature dei secondi di Nicholas, vedi regola 4)
   Esempi di trasformazione:
   - "300 g patate lessate / al forno"            → "Patate"            (verdure)
   - "330 g patate dolci lessate / al forno"      → "Patate dolci"      (verdure)
   - "90 g pasta integrale + sugo al pomodoro"    → "Pasta integrale"   (cereali) + "Passata di pomodoro" (dispensa)
   - "30 g parmigiano"                            → "Parmigiano"        (latticini)
   - "3 gallette di riso con velo di burro arachidi" → "Gallette di riso" (cereali) + "Burro di arachidi" (dispensa)
   - "verdura a scelta" / "verdure cotte/crude"   → "Verdura"           (verdure)  ← una sola voce generica
   - "un frutto a scelta" / "frutta di stagione"  → "Frutta"            (frutta)   ← una sola voce generica
   NON scrivere mai "verdure miste di stagione": scrivi solo "Verdura".

2b. RAGGRUPPA varianti simili dello stesso prodotto in UNA voce (alternative separate da /):
   - "biscotti secchi integrali" + "biscotti senza zuccheri aggiunti" → "Biscotti integrali / s.z."
   - "riso" + "riso basmati" + "riso venere"                          → "Riso (basmati / venere)"
   - "fette biscottate integrali" + "fette biscottate"               → "Fette biscottate integrali"
   - "yogurt greco magro" + "yogurt bianco intero"                   → "Yogurt greco / bianco"
   Obiettivo: voci sintetiche e furbe, non un elenco ripetitivo di micro-varianti.

3. ROUTING per reparto: ragiona su DOVE prendi fisicamente l'alimento al supermercato.
   - macelleria → carne (pollo, tacchino, carne bianca/rossa, bresaola fresca…)
   - pescheria → pesce e molluschi (merluzzo, orata, salmone, tonno fresco, gamberi, polpo…)
   - latticini → yogurt, latte, FORMAGGI, PARMIGIANO/grana, ricotta, mozzarella, burro…
   - banco → uova, affettati/salumi, tofu, ravioli/tortellini freschi, hummus
   - panetteria → pane, pane integrale, focaccia, pane di segale
   - cereali → pasta, riso, gallette, biscotti, fette biscottate, avena, cous cous, farro
   - verdure → TUTTO l'ortofrutta verdura: insalata, pomodori, zucchine, PATATE, patate dolci, zucca, carote…
   - frutta → frutta fresca, banane, spremute
   - dispensa → SOLO lunga conservazione: olio, marmellata, miele, passata/sugo, burro arachidi,
     tonno/legumi in scatola, frutta secca, cioccolato, barrette, cacao
   - integratori → creatina/BCAA/carnitina/sali/maltodestrine/proteine in polvere (owners ["nicholas"])
   - surgelati → solo se esplicitamente surgelato

4. GRAMMATURE: SOLO per i secondi proteici di NICHOLAS (macelleria e pescheria), un tipo per voce
   con i grammi di pranzo E cena. Es: {"t":"Carne bianca / pollo / tacchino (150g pranzo · 250g cena)"}.
   Tutto il resto SENZA grammi né cottura.

5. NOEMI (vegetariana): includi gli ingredienti delle sue scelte E quelli estratti dalle RICETTE
   scritte a mano. NON dimenticare la sua dieta: deve comparire roba sua.

6. MERGE: alimento per ENTRAMBI (es. pasta, riso, yogurt, verdura, frutta, olio, uova, pane)
   → UNA SOLA voce con owners ["nicholas","noemi"]. Non duplicare.

7. owners: valori possibili "nicholas", "noemi", "gatto", "coniglio".
   - cibo/persone: nicholas, noemi (o entrambi).
   - ANIMALI: prodotti per il gatto (cibo, lettiera, croccantini) → owners ["gatto"];
     prodotti per il coniglio (fieno, mangime) → owners ["coniglio"].
   - NON esiste più una categoria gatto/coniglio: gli articoli per animali vanno in "casa"
     (o "dispensa" se cibo a lunga conservazione) e si distinguono SOLO con l'owner.

8. NON includere acqua, sale, pepe, aromi. Genera SOLO ciò che deriva dalle diete (gli extra
   ricorrenti tipo fieno/lettiera/ghiaccioli li gestisce il sistema, non tu).

Esempio output (chiavi e voci illustrative):
{"macelleria":[{"t":"Carne bianca / pollo / tacchino (150g pranzo · 250g cena)","owners":["nicholas"]}],"pescheria":[{"t":"Pesce bianco merluzzo/orata/branzino (150g pranzo · 250g cena)","owners":["nicholas"]}],"banco":[{"t":"Tofu","owners":["noemi"]},{"t":"Uova","owners":["nicholas","noemi"]}],"latticini":[{"t":"Parmigiano","owners":["nicholas","noemi"]},{"t":"Yogurt greco","owners":["nicholas","noemi"]}],"panetteria":[{"t":"Pane integrale","owners":["nicholas","noemi"]}],"cereali":[{"t":"Pasta","owners":["nicholas","noemi"]}],"verdure":[{"t":"Patate","owners":["nicholas"]},{"t":"Verdura","owners":["nicholas","noemi"]}]}`;
}
