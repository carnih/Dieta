// CSS storico della vista ALLENAMENTI (classi .al-*, .card, .pdf-*, .sch-*, ecc.),
// portato FEDELE dal monolite index.html. Vive qui (file di proprieta' di questa
// pagina) perche' src/styles/index.css e' condiviso e non va toccato.
// Iniettato una sola volta tramite <AllenamentiStyles/>.

import { useEffect } from 'react';

const STYLE_ID = 'allenamenti-scoped-css';

const CSS = `
/* token locali (presenti nel monolite, non in index.css) */
.al-scope{ --font-head:'Rubik',-apple-system,'Segoe UI',sans-serif; --sh-1:0 1px 3px rgba(15,23,42,.06); --sh-2:0 10px 30px rgba(15,23,42,.12); --ease:cubic-bezier(.4,0,.2,1); }

/* page titles / sub */
.al-scope .page-title{font-size:28px;font-weight:850;letter-spacing:-.6px;color:#111827;position:sticky;top:0;z-index:15;background:var(--bg);margin:0 -16px;padding:8px 18px 6px;box-shadow:0 8px 12px -10px rgba(0,0,0,.12)}
.al-scope .vsub{position:sticky;top:48px;z-index:9;background:var(--bg);margin:0 -16px;padding:6px 16px 8px;display:flex;flex-direction:column;gap:8px;box-shadow:0 8px 12px -10px rgba(0,0,0,.12)}
.al-scope .page-title.n{background:var(--n-g);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-family:var(--font-head)}
.al-scope .page-sub{font-size:14px;color:#9CA3AF;font-weight:600;padding:2px 2px 6px}

/* card generica (nel monolite .card non aveva regola propria: usiamo lo stesso look di .cmp-card) */
.al-scope .card{background:#fff;border-radius:16px;box-shadow:var(--sh-1);overflow:hidden;margin-bottom:11px}

/* scheda di oggi */
.al-scope .today-al{border:2px solid #3B82F6;box-shadow:0 8px 22px rgba(59,130,246,.16)}
.al-scope .al-today-h{display:flex;align-items:center;gap:8px;padding:13px 15px;font-family:var(--font-head);font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#3B82F6;border-bottom:1px solid var(--border)}

/* card programma */
.al-scope .al-prog-h{display:flex;align-items:center;gap:9px;padding:14px 15px 6px;font-family:var(--font-head);font-weight:800;font-size:17px}
.al-scope .al-badge{margin-left:auto;font-size:11px;font-weight:800;background:var(--n-l);color:var(--n);padding:4px 10px;border-radius:50px}
.al-scope .al-bar{height:6px;background:#E7EEF6;border-radius:50px;margin:0 15px 10px;overflow:hidden}
.al-scope .al-bar>i{display:block;height:100%;background:linear-gradient(90deg,#2563EB,#60A5FA);border-radius:50px}
.al-scope .al-ctrl{display:flex;gap:8px;align-items:center;padding:0 15px 12px;flex-wrap:wrap}
.al-scope .al-date{font-size:12px;color:#64748B;font-weight:700;display:flex;align-items:center;gap:5px}
.al-scope .al-date input{font-family:inherit;font-size:12px;border:1.5px solid #DCE6F5;border-radius:8px;padding:5px 7px;color:#374151;outline:none}
.al-scope .al-btn{border:1.5px solid #DCE6F5;background:#fff;color:#2563EB;font-weight:700;font-size:12.5px;border-radius:50px;padding:7px 12px;cursor:pointer}
.al-scope .al-btn:active{background:#EFF6FF}
.al-scope .al-obj{font-size:12.5px;color:#3a4a63;background:#EEF4FF;border:1px solid #DCE6F5;border-radius:10px;padding:9px 11px;margin:0 15px 10px;line-height:1.45}
.al-scope .al-wk{border-top:1px solid var(--border)}
.al-scope .al-wk-row{display:flex;align-items:center;gap:9px;padding:11px 15px;cursor:pointer;font-weight:800;font-size:14px;color:#1F2937}
.al-scope .al-wk.cur .al-wk-row{color:#2563EB}
.al-scope .al-arrow{font-size:10px;color:#C2C8D0;transition:transform .2s var(--ease)}
.al-scope .al-arrow.cl{transform:rotate(-90deg)}
.al-scope .al-cur{margin-left:auto;font-size:9.5px;font-weight:800;text-transform:uppercase;background:var(--n-l);color:var(--n);padding:2px 8px;border-radius:50px}
.al-scope .al-wk-body{padding:0 15px 12px}
.al-scope .al-sess{margin:8px 0 4px}
.al-scope .al-sess-h{display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.03em;padding:4px 10px;border-radius:50px;margin-bottom:7px}
.al-scope .al-sess-h.d-nuoto{background:#CFFAFE;color:#0E7490}
.al-scope .al-sess-h.d-bici{background:#DBEAFE;color:#1D4ED8}
.al-scope .al-sess-h.d-corsa{background:#FEF3C7;color:#B45309}
.al-scope .al-sess-h.d-forza{background:#EDE9FE;color:#6D28D9}
.al-scope .al-sess-h.d-brick{background:#FFE4E6;color:#BE123C}
.al-scope .al-blk{margin-bottom:9px}
.al-scope .al-blk-n{font-size:11px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:.03em;margin-bottom:3px}
.al-scope .al-blk-r{font-size:13.5px;color:#374151;line-height:1.5;padding-left:10px;border-left:2px solid var(--border);white-space:pre-wrap}
.al-scope .al-note{font-size:12px;color:#9A6B1E;background:#FEF6E7;border:1px solid #F6E2BD;border-radius:9px;padding:7px 10px;margin-top:8px;line-height:1.4}

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
.al-scope .dash-cta{width:100%;display:flex;align-items:center;gap:13px;border:none;cursor:pointer;text-align:left;background:linear-gradient(135deg,#1E3A8A,#3B82F6);color:#fff;border-radius:16px;padding:15px 16px;margin:2px 0 6px;box-shadow:0 8px 22px rgba(37,99,235,.28);transition:transform .12s}
.al-scope .dash-cta:active{transform:scale(.99)}
.al-scope .dash-cta-ic{font-size:26px;flex:none}
.al-scope .dash-cta>span:nth-child(2){flex:1;min-width:0}
.al-scope .dash-cta b{display:block;font-family:var(--font-head);font-size:15.5px;font-weight:800;letter-spacing:-.2px}
.al-scope .dash-cta small{display:block;font-size:12px;opacity:.9;font-weight:600;margin-top:1px}
.al-scope .dash-cta-arr{font-size:26px;opacity:.85;flex:none}

/* head editor (back) */
.al-scope .dash-head{display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:15;background:var(--bg);margin:0 -16px;padding:8px 18px 10px;box-shadow:0 8px 12px -10px rgba(0,0,0,.12)}
.al-scope .dash-back{flex:none;width:40px;height:40px;border:none;background:#fff;box-shadow:var(--sh-1);border-radius:50%;font-size:19px;cursor:pointer;color:#1F2937}
.al-scope .dash-back:active{background:#F1F5F9}

/* viewer PDF (overlay fuori da .al-scope: lo stilo a parte) */
.pdf-ov{position:fixed;inset:0;background:rgba(20,20,30,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:14px}
.pdf-card{background:#fff;border-radius:16px;width:100%;max-width:780px;height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.3)}
.pdf-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 15px;border-bottom:1px solid var(--border);font-size:15px;color:#1F2937}
.pdf-x{border:none;background:transparent;font-size:18px;cursor:pointer;color:#9CA3AF;padding:2px 6px}
.pdf-frame{flex:1;width:100%;border:none}
.pdf-msg{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#6B7280;font-size:13.5px;text-align:center;padding:24px;line-height:1.5}
.pdf-actions{display:flex;gap:8px;padding:10px 15px;border-top:1px solid var(--border);justify-content:flex-end}
.pdf-card .al-btn{border:1.5px solid #DCE6F5;background:#fff;color:#2563EB;font-weight:700;font-size:12.5px;border-radius:50px;padding:7px 12px;cursor:pointer;text-decoration:none;display:inline-block}
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
