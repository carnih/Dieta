// Strutture dati default della DIETA, portate VERBATIM dal monolite index.html.
// Usate come seed quando il nodo Firebase è vuoto e come fallback in lettura.

import type {
  Categoria,
  CategoriaKey,
  NicholasDiet,
  NoemiBase,
} from '@/lib/types';

// ══════════════════════════════════════════
//  CATEGORIE
// ══════════════════════════════════════════
export const CAT: Record<CategoriaKey, Categoria> = {
  carbo: { pill: '🌾 Carboidrati' },
  prot: { pill: '🥩 Proteine' },
  frutta: { pill: '🍓 Frutta' },
  latte: { pill: '🥛 Latticini' },
  grasso: { pill: '🥜 Grassi' },
  sfizio: { pill: '🍫 Sfizio' },
  verdura: { pill: '🥦 Verdura' },
  bevanda: { pill: '☕ Bevanda' },
  olio: { pill: '🫒 Condimento' },
  integra: { pill: '💊 Integratore' },
  scegli: { pill: '🍽️ Scegli tra' },
  altro: { pill: '• Altro' },
};

// ══════════════════════════════════════════
//  NICHOLAS
// ══════════════════════════════════════════
export const NICHOLAS: NicholasDiet = {
  days: [
    {
      id: 'corsa',
      label: '🏃 Corsa',
      integ: { pre: '1 g carnitina', post: '6 g BCAA + Sali minerali + 3 g creatina' },
      pasti: [
        {
          icon: '☀️',
          nome: 'Colazione',
          items: [
            { cat: 'bevanda', v: 'Tè' },
            { cat: 'carbo', alts: ['2 fette pane integrale (1 marmellata Rigoni + 1 burro arachidi)', '4 fette biscottate integrali (2 marmellata Rigoni + 2 burro arachidi)'] },
            { cat: 'frutta', v: '150 ml succo di frutta senza zuccheri aggiunti' },
            { cat: 'latte', v: '150 g yogurt greco magro + 30 g fiocchi di mais/avena' },
          ],
        },
        {
          icon: '🍎',
          nome: 'Spuntino mattina',
          items: [
            { cat: 'latte', v: '30 g grana' },
            { cat: 'carbo', v: '1 galletta' },
          ],
        },
        {
          icon: '🍽️',
          nome: 'Pranzo',
          items: [
            { cat: 'carbo', alts: ['130 g riso / riso basmati / riso venere', '150 g pasta', '160 g pasta integrale', '90 g pane di segale'] },
            { cat: 'prot', alts: ['150 g carne bianca', '150 g tonno al naturale', '150 g pesce bianco (merluzzo/nasello/platessa/orata/branzino/triglia)', '100 g salmone', '120 g pesce spada', '80 g gamberetti', '200 g polipo / 150 g seppie o moscardini', '200 g legumi (peso a cotto)'] },
            { cat: 'verdura', v: 'A scelta' },
            { cat: 'olio', v: '1 cucchiaio olio EVO' },
          ],
        },
        {
          icon: '⚡',
          nome: 'Spuntino pre-allenamento',
          note: '2h prima',
          items: [{ cat: 'carbo', v: '3 gallette di riso con velo di miele' }],
        },
        {
          icon: '🌙',
          nome: 'Cena',
          items: [
            { cat: 'carbo', alts: ['80 g riso basmati + olio EVO', '90 g pasta integrale + sugo al pomodoro', '300 g patate lessate / al forno', '330 g patate dolci lessate / al forno', '70 g pane'] },
            { cat: 'prot', alts: ['250 g carne bianca', '180 g tonno (filetto)', '250 g pesce bianco (merluzzo/nasello/platessa/orata/branzino/triglia)', '150 g salmone', '160 g pesce spada', '250 g polipo / 200 g seppie o moscardini', '200 g carne rossa/vitello/lonza (max 1×sett.)', '150 g tofu', '240 g legumi'] },
            { cat: 'verdura', v: 'A scelta' },
            { cat: 'olio', v: '1 cucchiaio olio EVO' },
          ],
        },
      ],
    },
    {
      id: 'bici',
      label: '🚴 Bici',
      integ: { pre: '1 g carnitina + 3 g BCAA', post: '3 g BCAA + 3 g creatina' },
      pasti: [
        {
          icon: '⚡',
          nome: 'Pre-allenamento',
          items: [
            { cat: 'frutta', v: '1 banana' },
            { cat: 'carbo', v: '4 biscotti senza zuccheri aggiunti' },
          ],
        },
        {
          icon: '☀️',
          nome: 'Colazione',
          note: "dopo l'allenamento",
          items: [
            { cat: 'bevanda', v: 'Caffè' },
            { cat: 'scegli', alts: ['120 g yogurt bianco intero + fiocchi avena/crusca + fetta biscottata con burro arachidi', '200 ml latte parz. scremato senza lattosio + 2 fette biscottate int. (marmellata Rigoni + burro arachidi)', '2 fette pane integrale con yogurt greco/ricotta + cucchiaino miele/marmellata Rigoni'] },
          ],
        },
        {
          icon: '🍎',
          nome: 'Spuntino mattina',
          items: [
            { cat: 'grasso', v: '20 g frutta secca' },
            { cat: 'frutta', v: '150 g frutta' },
          ],
        },
        {
          icon: '🍽️',
          nome: 'Pranzo',
          items: [
            { cat: 'carbo', alts: ['130 g riso / riso basmati / riso venere', '150 g pasta', '160 g pasta integrale', '90 g pane di segale'] },
            { cat: 'prot', alts: ['150 g carne bianca', '150 g tonno al naturale', '150 g formaggio fresco (max 1×sett.)', '50–60 g formaggio stagionato (max 1×sett.)', '2 uova (max 1×sett.)', '150 g pesce bianco (merluzzo/nasello/platessa/orata/branzino/triglia)', '100 g salmone', '120 g pesce spada', '80 g gamberetti', '200 g polipo / 150 g seppie o moscardini'] },
            { cat: 'verdura', v: 'A scelta' },
            { cat: 'olio', v: '1 cucchiaio olio EVO' },
          ],
        },
        {
          icon: '🍊',
          nome: 'Spuntino pomeriggio',
          items: [{ cat: 'carbo', v: '3 gallette di riso con velo di burro arachidi' }],
        },
        {
          icon: '🌙',
          nome: 'Cena',
          items: [
            { cat: 'carbo', alts: ['80 g riso basmati + olio EVO', '90 g pasta integrale + sugo al pomodoro', '300 g patate lessate / al forno', '330 g patate dolci lessate / al forno', '70 g pane'] },
            { cat: 'prot', alts: ['250 g carne bianca', '180 g tonno (filetto)', '250 g pesce bianco (merluzzo/nasello/platessa/orata/branzino/triglia)', '150 g salmone', '160 g pesce spada', '250 g polipo / 200 g seppie o moscardini', '200 g carne rossa/vitello/lonza (max 1×sett.)', '2 uova', '240 g legumi'] },
            { cat: 'verdura', v: 'A scelta' },
            { cat: 'olio', v: '1 cucchiaio olio EVO' },
            { cat: 'latte', v: '150 g yogurt greco bianco magro' },
          ],
        },
      ],
    },
    {
      id: 'palestra',
      label: '🏊 Palestra · Nuoto · Padel',
      integ: { pre: '1 g carnitina', post: '3 g creatina' },
      pasti: [
        {
          icon: '⚡',
          nome: 'Pre-allenamento',
          items: [
            { cat: 'frutta', v: '1 banana' },
            { cat: 'carbo', v: '4 biscotti senza zuccheri aggiunti' },
          ],
        },
        {
          icon: '☀️',
          nome: 'Colazione',
          note: "dopo l'allenamento",
          items: [
            { cat: 'bevanda', v: 'Tè' },
            { cat: 'scegli', alts: ['2 fette pane integrale (marmellata Rigoni + burro arachidi)', '4 fette biscottate integrali (2 marmellata Rigoni + 2 burro arachidi)', '150 g yogurt greco magro + 30 g fiocchi mais/avena + 200 ml spremuta arancia'] },
          ],
        },
        {
          icon: '🍎',
          nome: 'Spuntino mattina',
          items: [
            { cat: 'carbo', v: '2 fette di pane' },
            { cat: 'prot', v: '50 g prosciutto cotto sgrassato' },
          ],
        },
        {
          icon: '🍽️',
          nome: 'Pranzo',
          items: [
            { cat: 'carbo', alts: ['100 g riso / riso basmati / riso venere', '110 g pasta', '120 g pasta integrale', '70 g pane di segale'] },
            { cat: 'prot', alts: ['150 g carne bianca', '150 g tonno al naturale', '150 g pesce bianco (merluzzo/nasello/platessa/orata/branzino/triglia)', '100 g salmone', '120 g pesce spada', '80 g gamberetti', '200 g polipo / 150 g seppie o moscardini', '80 g bresaola / 120 g arrosto tacchino / 100 g prosciutto cotto'] },
            { cat: 'verdura', v: 'A scelta' },
            { cat: 'olio', v: '1 cucchiaio olio EVO' },
          ],
        },
        {
          icon: '🍊',
          nome: 'Spuntino pomeriggio',
          items: [
            { cat: 'prot', alts: ['200 g yogurt greco bianco magro + cucchiaino miele', '200 g budino proteico'] },
            { cat: 'frutta', v: 'Un frutto a scelta' },
          ],
        },
        {
          icon: '🌙',
          nome: 'Cena',
          items: [
            { cat: 'carbo', alts: ['80 g riso basmati + olio EVO', '90 g pasta integrale + sugo al pomodoro', '300 g patate lessate / al forno', '330 g patate dolci lessate / al forno', '70 g pane'] },
            { cat: 'prot', alts: ['250 g carne bianca', '180 g tonno (filetto)', '250 g pesce bianco (merluzzo/nasello/platessa/orata/branzino/triglia)', '150 g salmone', '160 g pesce spada', '250 g polipo / 200 g seppie o moscardini'] },
            { cat: 'verdura', v: 'A scelta' },
            { cat: 'olio', v: '1 cucchiaio olio EVO' },
          ],
        },
      ],
    },
    {
      id: 'combinato',
      label: '🔥 Combinato',
      integ: {
        multi: [
          { tag: 'Pre 1°', v: '1 g carnitina' },
          { tag: 'Post 1°', v: '3 g creatina' },
          { tag: 'Pre bici', v: '1 gel maltodestrine' },
          { tag: 'Pre corsa', v: '1 gel maltodestrine' },
          { tag: 'Post tutto', v: '6 g BCAA' },
        ],
      },
      pasti: [
        {
          icon: '⚡',
          nome: 'Pre-allenamento',
          items: [
            { cat: 'frutta', v: '1 banana' },
            { cat: 'carbo', v: '6 biscotti senza zuccheri aggiunti' },
          ],
        },
        {
          icon: '☀️',
          nome: 'Colazione',
          note: "dopo l'allenamento",
          items: [
            { cat: 'carbo', v: '2 fette pane tostato' },
            { cat: 'prot', alts: ['80 g arrosto di tacchino', '2 uova'] },
            { cat: 'frutta', v: "150 ml spremuta d'arancia" },
          ],
        },
        {
          icon: '🍎',
          nome: 'Spuntino mattina',
          items: [
            { cat: 'grasso', v: '20 g frutta secca' },
            { cat: 'frutta', v: '150 g frutta' },
          ],
        },
        {
          icon: '🍽️',
          nome: 'Pranzo',
          items: [
            { cat: 'carbo', alts: ['100 g riso / riso basmati / riso venere', '120 g pasta', '130 g pasta integrale', '90 g pane'] },
            { cat: 'prot', alts: ['150 g carne bianca', '150 g tonno al naturale', '150 g pesce bianco (merluzzo/nasello/platessa/orata/branzino/triglia)', '100 g salmone', '120 g pesce spada', '80 g gamberetti', '200 g polipo / 150 g seppie o moscardini', '150 g hummus di ceci', '200 g legumi (peso a cotto)'] },
            { cat: 'verdura', v: 'A scelta' },
            { cat: 'olio', v: '1 cucchiaio olio EVO' },
          ],
        },
        {
          icon: '🍊',
          nome: 'Spuntino pomeriggio',
          items: [
            { cat: 'carbo', v: '3 gallette di riso con velo di burro arachidi' },
            { cat: 'latte', v: '150 g yogurt greco bianco magro' },
          ],
        },
        {
          icon: '🌙',
          nome: 'Cena',
          items: [
            { cat: 'carbo', alts: ['80 g riso basmati + olio EVO', '90 g pasta integrale + sugo al pomodoro', '300 g patate lessate / al forno', '330 g patate dolci lessate / al forno', '70 g pane'] },
            { cat: 'prot', alts: ['250 g carne bianca', '180 g tonno (filetto)', '250 g pesce bianco (merluzzo/nasello/platessa/orata/branzino/triglia)', '150 g salmone', '160 g pesce spada', '250 g polipo / 200 g seppie o moscardini', '200 g carne rossa/vitello/lonza (max 1×sett.)', '2 uova'] },
            { cat: 'verdura', v: 'A scelta' },
            { cat: 'olio', v: '1 cucchiaio olio EVO' },
          ],
        },
      ],
    },
    {
      id: 'riposo',
      label: '😴 Riposo',
      integ: { multi: [{ tag: 'Colazione', v: '3 g creatina' }] },
      pastoLibero: '🍕 Concediti un pasto libero a settimana — meglio oggi!',
      pasti: [
        {
          icon: '☀️',
          nome: 'Colazione',
          items: [
            { cat: 'bevanda', v: 'Caffè' },
            { cat: 'scegli', alts: ["120 g yogurt bianco intero + fiocchi avena/crusca d'avena + fetta biscottata con burro arachidi", '200 ml latte parz. scremato senza lattosio + 2 fette biscottate int. (marmellata Rigoni + burro arachidi)', '2 fette pane integrale con yogurt greco/ricotta + cucchiaino miele/marmellata Rigoni'] },
          ],
        },
        {
          icon: '🍎',
          nome: 'Spuntino mattina',
          items: [{ cat: 'frutta', v: 'Un frutto a scelta' }],
        },
        {
          icon: '🍽️',
          nome: 'Pranzo',
          items: [
            { cat: 'carbo', alts: ['100 g riso / riso basmati / riso venere', '120 g pasta', '130 g pasta integrale', '70 g pane di segale'] },
            { cat: 'prot', alts: ['150 g carne bianca', '150 g tonno al naturale', '150 g pesce bianco (merluzzo/nasello/platessa/orata/branzino/triglia)', '100 g salmone', '120 g pesce spada', '80 g gamberetti', '200 g polipo / 150 g seppie o moscardini'] },
            { cat: 'verdura', v: 'A scelta' },
            { cat: 'olio', v: '1 cucchiaio olio EVO' },
          ],
        },
        {
          icon: '🍊',
          nome: 'Spuntino pomeriggio',
          items: [{ cat: 'latte', v: '200 g yogurt greco bianco magro' }],
        },
        {
          icon: '🌙',
          nome: 'Cena',
          items: [
            { cat: 'carbo', alts: ['80 g riso basmati + olio EVO', '90 g pasta integrale + sugo al pomodoro', '300 g patate lessate / al forno', '330 g patate dolci lessate / al forno', '70 g pane'] },
            { cat: 'prot', alts: ['250 g carne bianca', '180 g tonno (filetto)', '250 g pesce bianco (merluzzo/nasello/platessa/orata/branzino/triglia)', '150 g salmone', '160 g pesce spada', '250 g polipo / 200 g seppie o moscardini', '200 g carne rossa/vitello/lonza (max 1×sett.)', '150 g tofu', '240 g legumi'] },
            { cat: 'verdura', v: 'A scelta' },
            { cat: 'olio', v: '1 cucchiaio olio EVO' },
          ],
        },
      ],
    },
  ],
};

// ══════════════════════════════════════════
//  NOEMI — dieta base (nutrizionista, vegetariana)
// ══════════════════════════════════════════
export const NOEMI_BASE: NoemiBase = {
  colazione: {
    icon: '☀️',
    nome: 'Colazione',
    slots: [
      { key: 'cz_base', cat: 'latte', label: 'Base', opts: ['125 g yogurt magro 0,1%', '200 ml latte parz. scremato / soia / avena'] },
      { key: 'cz_carb', cat: 'carbo', label: 'Cereali/pane', opts: ['6–8 biscotti secchi o integrali', '4 fette biscottate integrali', '2 fette pane integrale + marmellata s.z.', '40 g cereali integrali'] },
    ],
    fixed: [
      { cat: 'frutta', v: '200 g frutta di stagione' },
      { cat: 'bevanda', v: 'Caffè / the / tisane' },
    ],
  },

  spuntino: {
    icon: '🍎',
    nome: 'Spuntino',
    slots: [
      { key: 'sp', cat: 'frutta', label: 'Spuntino', opts: ['Un frutto (o un succo)', '200 g budino proteico', 'Barretta ai cereali proteica', 'Yogurt con cereali o frutta secca'] },
    ],
    fixed: [],
  },

  pranzo: {
    icon: '🍽️',
    nome: 'Pranzo',
    slots: [
      {
        key: 'pr',
        cat: 'carbo',
        label: 'Piatto',
        opts: [
          'Primo: 80 g pasta + sugo verdure/pomodoro/bianco + 30 g parmigiano',
          'Primo: 90 g riso + sugo + 30 g parmigiano',
          'Primo: 125 g gnocchi + sugo + 30 g parmigiano',
          'Primo: 90 g cereali + sugo + 30 g parmigiano',
          'Secondo a scelta + 50 g pane (o crackers/gallette/2 patate)',
          'Pizza (pasto libero)',
        ],
      },
      { key: 'pr_veg', cat: 'verdura', label: 'Verdura', opts: ['Verdure cotte', 'Verdure crude / insalata', 'Verdure miste', '— niente'] },
    ],
    fixed: [],
  },

  merenda: {
    icon: '🍊',
    nome: 'Merenda',
    slots: [
      { key: 'me', cat: 'frutta', label: 'Merenda', opts: ['Un frutto (o un succo)', '150 g yogurt greco', '200 g budino proteico', 'Barretta proteica', 'Yogurt con cereali o frutta secca'] },
    ],
    fixed: [{ cat: 'grasso', v: '(eventuale) 2 gallette di mais con cioccolato fondente' }],
  },

  cena: {
    icon: '🌙',
    nome: 'Cena',
    slots: [
      { key: 'cn_sec', cat: 'prot', label: 'Secondo', opts: ['Pesce 150 g', 'Crostacei / molluschi 150 g', 'Uova (albumi liberi · max 2 tuorli/sett)', 'Formaggio 150 g', 'Legumi 200 g'] },
      { key: 'cn_carb', cat: 'carbo', label: 'Contorno', opts: ['50 g pane integrale', '40 g crackers / grissini int.', '40 g gallette mais / riso', '— niente'] },
      { key: 'cn_veg', cat: 'verdura', label: 'Verdura', opts: ['Verdure cotte', 'Verdure crude / insalata', 'Verdure miste', 'Minestrone / passato (senza legumi)', '— niente'] },
      { key: 'cn_dol', cat: 'sfizio', label: 'Dolce', opts: ['125 g yogurt magro 0,1%', 'Budino di soia / cioccolato / vaniglia', '10 g cioccolato fondente 75%', '— niente'] },
    ],
    fixed: [],
  },
};

export const NOEMI_MEALS = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'] as const;

// pasti della pagina Noemi (scrittura libera) — icone coerenti con dieta base/Nicholas
export const NOEMI_PAGE_MEALS: [string, string, string][] = [
  ['colazione', '☀️', 'Colazione'],
  ['spuntino', '🍎', 'Spuntino'],
  ['pranzo', '🍽️', 'Pranzo'],
  ['merenda', '🍊', 'Merenda'],
  ['cena', '🌙', 'Cena'],
  ['dolcetto', '🍫', 'Dolcetto'],
];

export const NOEMI_NOTES: string[] = [
  '🍝 5 pranzi “primo piatto” + 1–2 “secondo + contorno” a settimana',
  '🍕 1 pizza al posto di un pasto + 1 pasto libero a settimana',
  '☕ 1–2 colazioni libere a settimana',
  '🐟 Pesce 2×/sett · 🥚 max 2 tuorli/sett (albumi liberi)',
  '🍎 Frutta “da controllare” (banane, uva, avocado…) 1×/giorno · 🥦 verdure “da controllare” (mais, patate, zucca…) 1×/sett',
  '🫒 Max 2–3 cucchiai olio EVO/giorno · 🥗 vegetariana (no carne/salumi)',
];

export const NOEMI_REF: [string, string][] = [
  ['🐟 Pesce', 'baccalà, orata, sogliola, branzino, merluzzo, nasello, triglia, trota, platessa, rombo, persico (150 g). Da controllare 2×: spada, salmone, tonno, sgombro (100 g)'],
  ['🦐 Crostacei/molluschi', 'calamari, polpi, gamberi, seppie, cozze, vongole, moscardini, totani, astice… (150 g)'],
  ['🧀 Formaggi', 'ricotta, fiocchi di latte, primosale, mozzarella, stracchino, robiola, crescenza, feta, philadelphia (150/100 g)'],
  ['🫘 Legumi', 'fagioli, lenticchie, piselli, soia, fave, ceci (200 g cotti)'],
  ['🥦 Verdure', 'finocchi, pomodori, carciofi, funghi, peperoni, cetrioli, lattuga, spinaci, zucchine, melanzane, broccoli… (libere)'],
  ['🍓 Frutta', 'albicocche, fragole, ciliegie, pesca, mela, melone, anguria, ananas, arancia, pera, kiwi… (1 porzione)'],
];
