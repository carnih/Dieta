// CSS storico della vista ALLENAMENTI (classi .al-*, .card, .pdf-*, .sch-*, ecc.),
// portato FEDELE dal monolite index.html. Vive qui (file di proprieta' di questa
// pagina) perche' src/styles/index.css e' condiviso e non va toccato.
// Iniettato una sola volta tramite <AllenamentiStyles/>.

import { useEffect } from 'react';

const STYLE_ID = 'allenamenti-scoped-css';

const CSS = `
/* token locali (presenti nel monolite, non in index.css) */
.al-scope{ --font-head:var(--font-round); --ease:cubic-bezier(.4,0,.2,1); }

/* page titles / sub */
.al-scope .page-title{font-size:32px;font-weight:700;letter-spacing:-.4px;color:#111827;position:sticky;top:env(safe-area-inset-top,0px);z-index:15;background:var(--bg);margin:0 -16px;padding:8px 18px 6px;box-shadow:0 8px 12px -10px rgba(0,0,0,.12)}
.al-scope .vsub{position:sticky;top:calc(env(safe-area-inset-top,0px) + 48px);z-index:9;background:var(--bg);margin:0 -16px;padding:6px 16px 8px;display:flex;flex-direction:column;gap:8px;box-shadow:0 8px 12px -10px rgba(0,0,0,.12)}
/* titolo a colore pieno (opaco): cosi' lo sticky copre il contenuto sotto e il
   testo resta visibile (il gradiente-su-testo rendeva trasparente il box). */
.al-scope .page-title.n{color:var(--n);background:var(--bg);font-family:var(--font-head)}
.al-scope .page-sub{font-size:14px;color:#9CA3AF;font-weight:600;padding:2px 2px 6px}
/* obiettivo: riquadro pastello nic come nel mockup */
.al-scope .vsub .page-sub{display:flex;align-items:center;gap:8px;border:1px solid rgba(59,130,246,.2);background:var(--n-l);border-radius:14px;padding:8px 14px;color:#2b4a7e;font-weight:600}

/* griglia desktop: scheda oggi | programmi */
.al-scope .al-grid{display:flex;flex-direction:column;gap:11px}
@media(min-width:1024px){
  .al-scope .al-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;align-items:start}
  .al-scope .al-grid .today-al{grid-column:span 2;align-self:start}
  .al-scope .al-grid .al-progs{grid-column:span 3;display:flex;flex-direction:column;gap:11px}
  .al-scope .al-grid .today-al,.al-scope .al-grid .al-progs .card{margin-bottom:0}
}

/* card generica: bianca, radius 20, ombra morbida, spaziatura generosa */
.al-scope .card{background:#fff;border-radius:20px;box-shadow:var(--shadow-soft);overflow:hidden;margin-bottom:11px}

/* quadratino icona pastello per le intestazioni */
.al-scope .al-ic{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;font-size:16px;flex:none;background:var(--n-l)}

/* scheda di oggi: evidenziata con ring nic */
.al-scope .today-al{box-shadow:var(--shadow-soft);outline:2px solid rgba(59,130,246,.5);outline-offset:-2px}
.al-scope .al-today-h{display:flex;align-items:center;gap:10px;padding:14px 18px;background:var(--n-l);font-family:var(--font-head);font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#3B82F6}

/* card programma */
.al-scope .al-prog-h{display:flex;align-items:center;gap:10px;padding:16px 18px 8px;font-family:var(--font-head);font-weight:800;font-size:18px;color:var(--text)}
.al-scope .al-badge{margin-left:auto;font-size:11px;font-weight:800;background:var(--n-l);color:var(--n);padding:4px 11px;border-radius:999px}
.al-scope .al-bar{height:8px;background:#E7EEF6;border-radius:999px;margin:4px 18px 12px;overflow:hidden}
.al-scope .al-bar>i{display:block;height:100%;background:linear-gradient(90deg,#2563EB,#60A5FA);border-radius:999px;transition:width .3s var(--ease)}
.al-scope .al-ctrl{display:flex;gap:8px;align-items:center;padding:0 18px 14px;flex-wrap:wrap}
.al-scope .al-date{font-size:11px;color:var(--muted);font-weight:800;letter-spacing:.02em;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);background:#fff;border-radius:999px;padding:5px 11px}
.al-scope .al-date input{font-family:inherit;font-size:11px;font-weight:800;border:none;background:transparent;color:#374151;outline:none;padding:0}
.al-scope .al-btn{border:1px solid var(--border);background:#fff;color:#2563EB;font-weight:800;font-size:11px;letter-spacing:.02em;border-radius:999px;padding:6px 13px;cursor:pointer;transition:transform .2s var(--ease),box-shadow .2s var(--ease),background .2s var(--ease)}
.al-scope .al-btn:hover{transform:translateY(-1px)}
.al-scope .al-btn:active{background:var(--n-l);transform:none}
@media(prefers-reduced-motion:reduce){.al-scope .al-btn{transition:none}.al-scope .al-btn:hover{transform:none}}
/* nota PT / obiettivi: riquadro pastello viola (forza) / rosa (tri) */
.al-scope .al-obj{font-size:12.5px;color:#5b4a86;background:rgba(244,238,251,.6);border-radius:12px;padding:10px 14px;margin:0 18px 12px;line-height:1.45}
.al-scope .tri-prog .al-obj{color:#9c4f78;background:rgba(253,242,248,.7)}
.al-scope .al-wk{border-top:1px solid var(--border)}
.al-scope .al-wk-row{display:flex;align-items:center;gap:10px;padding:12px 18px;cursor:pointer;font-weight:800;font-size:14px;color:var(--muted)}
.al-scope .al-wk.cur{background:#FAFCFB}
.al-scope .al-wk.cur .al-wk-row{color:#2563EB}
.al-scope .al-arrow{font-size:10px;color:#C2C8D0;transition:transform .2s var(--ease)}
.al-scope .al-wk.cur .al-arrow{color:#2563EB}
.al-scope .al-arrow.cl{transform:rotate(-90deg)}
.al-scope .al-cur{margin-left:auto;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;background:var(--n-l);color:var(--n);padding:3px 9px;border-radius:999px}
.al-scope .al-wk-body{padding:0 18px 14px}
.al-scope .al-sess{margin:8px 0 4px}
.al-scope .al-sess-h{display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.03em;padding:4px 11px;border-radius:8px;margin-bottom:8px}
.al-scope .al-sess-h.d-nuoto{background:#ECFEFF;color:#0E7490}
.al-scope .al-sess-h.d-bici{background:#EFF6FF;color:#1D4ED8}
.al-scope .al-sess-h.d-corsa{background:#FFF7E6;color:#B45309}
.al-scope .al-sess-h.d-forza{background:#F4EEFB;color:#7C5CD6}
.al-scope .al-sess-h.d-brick{background:#FEF2F4;color:#BE2E54}
.al-scope .al-blk{margin-bottom:10px}
.al-scope .al-blk-n{font-size:10.5px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}
.al-scope .al-blk-r{font-size:14px;color:var(--text);line-height:1.5;padding-left:12px;border-left:2px solid var(--border);white-space:pre-wrap}
.al-scope .al-note{font-size:12.5px;color:#9A6B1E;background:#FFF7E6;border-radius:10px;padding:8px 12px;margin-top:8px;line-height:1.45}

/* editor schede */
.al-scope .sch-title{flex:1;min-width:0;border:none;border-bottom:1px dashed #93C5FD;background:transparent;font-family:var(--font-head);font-weight:800;font-size:14px;color:#1F2937;outline:none;padding:0 0 2px}
.al-scope .sch-title:focus{border-bottom-color:var(--n)}
.al-scope .sch-name{width:100%;border:1px solid #DCE6F5;border-radius:8px;background:#fff;padding:5px 9px;outline:none;font-size:11.5px;font-weight:800;color:#2563EB;text-transform:uppercase;letter-spacing:.03em;font-family:inherit}
.al-scope .sch-name:focus{border-color:var(--n);box-shadow:0 0 0 3px var(--n-l)}
.al-scope .sch-righe{display:block;width:100%;border:1px solid transparent;border-left:2px solid var(--border);background:transparent;resize:none;font-family:inherit;font-size:13.5px;color:#374151;line-height:1.5;outline:none;padding:4px 0 2px 10px;margin-top:4px;border-radius:0 8px 8px 0}
.al-scope .sch-righe:focus{border-left-color:var(--n);background:#FAFCFF}
.al-scope .ta-auto{overflow:hidden}

/* obiettivo input */
.al-scope .obj-in{border:none;border-bottom:1px dashed #CBD5E1;background:transparent;font-family:inherit;font-size:14px;font-weight:600;color:#475569;outline:none;padding:2px 0;width:70%;min-width:180px}
.al-scope .obj-in:focus{border-bottom-color:var(--n);color:#1F2937}

/* CTA dashboard */
.al-scope .dash-cta{width:100%;display:flex;align-items:center;gap:14px;border:none;cursor:pointer;text-align:left;background:linear-gradient(90deg,#2563EB,#5B8DEF);color:#fff;border-radius:20px;padding:18px 18px;margin:2px 0 11px;box-shadow:var(--shadow-soft);transition:transform .2s var(--ease)}
.al-scope .dash-cta:hover{transform:translateY(-1px)}
.al-scope .dash-cta:active{transform:none}
@media(prefers-reduced-motion:reduce){.al-scope .dash-cta{transition:none}.al-scope .dash-cta:hover{transform:none}}
.al-scope .dash-cta-ic{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.2);font-size:22px;flex:none}
.al-scope .dash-cta>span:nth-child(2){flex:1;min-width:0}
.al-scope .dash-cta b{display:block;font-family:var(--font-head);font-size:15.5px;font-weight:800;letter-spacing:-.2px}
.al-scope .dash-cta small{display:block;font-size:12px;opacity:.9;font-weight:600;margin-top:1px}
.al-scope .dash-cta-arr{font-size:26px;opacity:.85;flex:none}

/* head editor (back) */
.al-scope .dash-head{display:flex;align-items:center;gap:12px;position:sticky;top:env(safe-area-inset-top,0px);z-index:15;background:var(--bg);margin:0 -16px;padding:8px 18px 10px;box-shadow:0 8px 12px -10px rgba(0,0,0,.12)}
.al-scope .dash-back{flex:none;width:40px;height:40px;border:none;background:#fff;box-shadow:var(--shadow-soft);border-radius:50%;font-size:19px;cursor:pointer;color:#1F2937}
.al-scope .dash-back:active{background:#F1F5F9}

/* viewer PDF (overlay fuori da .al-scope: lo stilo a parte) */
.pdf-ov{position:fixed;inset:0;background:rgba(20,20,30,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:14px}
.pdf-card{background:#fff;border-radius:20px;width:100%;max-width:780px;height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.3)}
.pdf-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 15px;border-bottom:1px solid var(--border);font-size:15px;color:#1F2937}
.pdf-x{border:none;background:transparent;font-size:18px;cursor:pointer;color:#9CA3AF;padding:2px 6px}
.pdf-frame{flex:1;width:100%;border:none}
.pdf-msg{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#6B7280;font-size:13.5px;text-align:center;padding:24px;line-height:1.5}
.pdf-actions{display:flex;gap:8px;padding:10px 15px;border-top:1px solid var(--border);justify-content:flex-end}
.pdf-card .al-btn{border:1px solid var(--border);background:#fff;color:#2563EB;font-weight:800;font-size:12px;border-radius:999px;padding:7px 13px;cursor:pointer;text-decoration:none;display:inline-block}
`;

/** Inietta una sola volta il CSS storico della vista Allenamenti. */
export function useAllenamentiStyles(): void {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
    // Non rimuovo allo smontaggio: il foglio e' globale e idempotente.
  }, []);
}
