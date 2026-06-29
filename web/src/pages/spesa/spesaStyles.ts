// CSS della vista Spesa, portato FEDELE dal monolite index.html.
// Vive qui (non in src/styles/index.css) per rispettare il vincolo anti-conflitto:
// ogni agente tocca solo i propri file. Iniettato una volta via <style> dalla pagina.
// Aggiunge solo i token --sh-1 / --r se non già definiti (index.css definisce --r).

export const SPESA_CSS = `
.spesa-scope{--sh-1:0 1px 3px rgba(16,24,40,.06),0 1px 2px rgba(16,24,40,.04)}
.spesa-scope .page-title{font-family:var(--font-head,inherit);font-weight:800;font-size:22px;color:#1F2937;margin:2px 0 12px}

/* check circolare */
.spesa-scope .sp-circle{flex-shrink:0;width:25px;height:25px;border-radius:50%;border:2px solid #D7DCE2;background:#fff;cursor:pointer;position:relative;transition:all .15s;padding:0}
.spesa-scope .sp-circle.on{background:var(--grn);border-color:var(--grn)}
.spesa-scope .sp-circle.on::after{content:'';position:absolute;left:7px;top:3.5px;width:6px;height:11px;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:rotate(45deg)}
.spesa-scope .sp-circle.sm{width:21px;height:21px;border-width:2px}
.spesa-scope .sp-circle.sm.on::after{left:5.5px;top:2.5px;width:5px;height:9px}

/* toolbar */
.spesa-scope .shop-prog{margin-bottom:10px}
.spesa-scope .shop-prog-txt{font-size:12.5px;font-weight:700;color:#9CA3AF;margin-bottom:5px}
.spesa-scope .shop-prog-track{height:6px;background:#E7EAEF;border-radius:50px;overflow:hidden}
.spesa-scope .shop-prog-fill{height:100%;background:linear-gradient(90deg,#16A34A,#4ADE80);border-radius:50px;transition:width .3s}
.spesa-scope .shop-actions{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.spesa-scope .shop-tool{flex-shrink:0;border:none;background:#fff;color:#6B7280;font-size:14px;font-weight:700;padding:10px 14px;border-radius:50px;cursor:pointer;box-shadow:var(--sh-1)}
.spesa-scope .shop-tool.gen{background:linear-gradient(135deg,#059669,#34D399);color:#fff;box-shadow:0 6px 16px rgba(5,150,105,.3)}
.spesa-scope .shop-tool.sec{background:#FFF7ED;color:#B45309;border:1.5px solid #FED7AA;box-shadow:none}
.spesa-scope .shop-tool.sec:active{background:#FFEDD5}
.spesa-scope .shop-tool.icon{width:42px;height:42px;padding:0;display:flex;align-items:center;justify-content:center;font-size:16px}
.spesa-scope .shop-tool:active{transform:scale(.95)}

/* barra filtri (sticky) */
.spesa-scope .vsub{position:sticky;top:0;z-index:20;background:var(--bg,#f1faf6);padding-top:4px;margin:0 -2px}
.spesa-scope .shop-filters{display:flex;gap:7px;margin-bottom:12px;overflow-x:auto;scrollbar-width:none}
.spesa-scope .shop-filters::-webkit-scrollbar{display:none}
.spesa-scope .shop-filter{flex-shrink:0;border:1.5px solid #E2E8F0;background:#fff;color:#9CA3AF;font-size:13px;font-weight:700;padding:7px 14px;border-radius:50px;cursor:pointer;transition:all .15s}
.spesa-scope .shop-filter.on{border-color:transparent}
.spesa-scope .shop-filter.on.f-pantry{background:#FEF3C7;color:#92400E}
.spesa-scope .shop-filter.on.f-nicholas{background:var(--n-l);color:var(--n)}
.spesa-scope .shop-filter.on.f-noemi{background:#FCE7F3;color:var(--e)}
.spesa-scope .shop-filter.on.f-gatto{background:#FEF3C7;color:#92400E}
.spesa-scope .shop-filter.on.f-coniglio{background:#E0E7FF;color:#4338CA}
.spesa-scope .shop-filter.on.f-tobuy{background:#DCFCE7;color:#15803D}

/* toggle dispensa 🏠 su voce */
.spesa-scope .shop-pantry-btn{flex-shrink:0;border:none;background:transparent;font-size:15px;cursor:pointer;padding:3px 5px;border-radius:8px;opacity:.35;filter:grayscale(1);transition:all .15s}
.spesa-scope .shop-row:hover .shop-pantry-btn{opacity:.7}
.spesa-scope .shop-pantry-btn:active{transform:scale(.85)}
.spesa-scope .shop-pantry-btn.on{opacity:1;filter:none;background:#FDE68A;border:1.5px solid #F59E0B;padding:4px 7px}
.spesa-scope .shop-row.pantry-row .shop-name{font-style:italic;color:#9CA3AF;font-size:14px}
.spesa-scope .shop-row.pantry-row{background:#FFFDF5}
.spesa-scope .pantry-check{flex-shrink:0;width:25px;height:25px;border-radius:50%;border:2px solid #D1D5DB;background:#D1D5DB;position:relative;cursor:default}
.spesa-scope .pantry-check::after{content:'';position:absolute;left:7px;top:3.5px;width:6px;height:11px;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:rotate(45deg)}

/* lista */
.spesa-scope .shop{background:#fff;border-radius:var(--r);box-shadow:var(--sh-1);overflow:hidden;padding:4px 0}
.spesa-scope .shop-sec{padding:0}
.spesa-scope .shop-sec-h{display:flex;align-items:center;gap:11px;padding:14px 16px 7px}
.spesa-scope .shop-sec-name{font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#AEB4BE}
.spesa-scope .shop-sec-n{margin-left:auto;font-size:11px;font-weight:800;color:var(--grn);background:#E9F9EE;border-radius:20px;padding:2px 9px}
.spesa-scope .shop-row{display:flex;align-items:center;gap:13px;padding:11px 16px;border-top:1px solid #F4F5F7}
.spesa-scope .shop-name{flex:1;font-size:15.5px;color:#1F2937;line-height:1.3;outline:none;border-radius:6px;padding:2px 4px;margin:-2px -4px}
.spesa-scope .shop-name:focus{background:#F1F5F9;box-shadow:inset 0 0 0 1.5px #CBD5E1}
.spesa-scope .shop-row.done .shop-name{text-decoration:line-through;color:#C5CAD2}
.spesa-scope .shop-x{flex-shrink:0;border:none;background:transparent;color:#DDE1E6;font-size:14px;cursor:pointer;padding:4px;opacity:0;transition:opacity .15s}
.spesa-scope .shop-row:hover .shop-x,.spesa-scope .shop-row.done .shop-x{opacity:1}
.spesa-scope .shop-addrow{display:flex;align-items:center;gap:11px;padding:8px 16px 12px}
.spesa-scope .shop-plus{width:25px;text-align:center;color:#C5CAD2;font-size:20px;font-weight:300;flex-shrink:0}
.spesa-scope .shop-in{flex:1;min-width:0;border:none;outline:none;font-family:inherit;font-size:14.5px;color:#374151;background:transparent;padding:4px 0}
.spesa-scope .shop-in::placeholder{color:#C5CAD2}

/* owner badges */
.spesa-scope .owner-badges{display:flex;gap:3px;flex-shrink:0;align-items:center;margin-left:6px}
.spesa-scope .owner-badge{width:20px;height:20px;border-radius:50%;font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center;letter-spacing:0;border:1.5px solid transparent;cursor:pointer;transition:all .15s;background:none;padding:0}
.spesa-scope .owner-badge.n{background:var(--n-l);color:var(--n);border-color:var(--n)}
.spesa-scope .owner-badge.e{background:#FCE7F3;color:var(--e);border-color:var(--e)}
.spesa-scope .owner-badge.g{background:#FEF3C7;border-color:#F59E0B;font-size:11px}
.spesa-scope .owner-badge.c{background:#E0E7FF;border-color:#6366F1;font-size:11px}
.spesa-scope .owner-badge.off{opacity:.28;border-color:#E0E0E0;filter:grayscale(.6)}

/* storico + meta */
.spesa-scope .shop-hist{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.spesa-scope .shop-hist button{border:1.5px solid #E2E8F0;background:#fff;color:#6B7280;font-size:13px;font-weight:700;padding:8px 13px;border-radius:50px;cursor:pointer}
.spesa-scope .shop-hist button:active{background:#F1F5F9}
.spesa-scope .spesa-meta{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:12px;color:#9CA3AF}
.spesa-scope .spesa-meta .ini{width:22px;height:22px;border-radius:50%;background:var(--n-l);color:var(--n);font-weight:900;display:flex;align-items:center;justify-content:center;font-size:11px}

/* overlay + category manager */
.spesa-scope .cat-editor-overlay{position:fixed;inset:0;z-index:998;background:rgba(15,23,42,.45);opacity:0;pointer-events:none;transition:opacity .2s}
.spesa-scope .cat-editor-overlay.show{opacity:1;pointer-events:auto}
.spesa-scope .catman-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999;width:92%;max-width:440px;max-height:80vh;display:flex;flex-direction:column;background:#fff;border-radius:22px;padding:18px 16px 16px;box-shadow:0 24px 70px rgba(0,0,0,.32);animation:catmanIn .22s cubic-bezier(.4,0,.2,1)}
@keyframes catmanIn{from{opacity:0;transform:translate(-50%,-46%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.spesa-scope .catman-head{display:flex;align-items:center;margin-bottom:14px}
.spesa-scope .catman-title{font-size:21px;font-weight:850;letter-spacing:-.4px;color:#111827}
.spesa-scope .catman-close{margin-left:auto;border:none;background:#F1F5F9;color:#64748B;width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s}
.spesa-scope .catman-close:active{background:#E2E8F0}
.spesa-scope .catman-list{overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:8px;margin-bottom:14px;padding:2px}
.spesa-scope .catman-row{display:flex;align-items:center;gap:9px;background:#fff;border-radius:13px}
.spesa-scope .catman-row.catman-dragging{box-shadow:0 12px 30px rgba(0,0,0,.2);position:relative;z-index:5}
.spesa-scope .catman-drag{flex:none;width:24px;height:46px;display:flex;align-items:center;justify-content:center;color:#C5CAD2;font-size:18px;cursor:grab;touch-action:none;user-select:none;letter-spacing:-2px}
.spesa-scope .catman-drag:active{cursor:grabbing;color:var(--e)}
.spesa-scope .catman-emoji{width:46px;height:46px;flex:none;text-align:center;font-size:21px;border:1.5px solid #E5E7EB;border-radius:13px;background:#FAFBFC;outline:none;transition:border-color .15s,background .15s;cursor:pointer}
.spesa-scope .catman-emoji:focus{border-color:var(--e);background:#fff}
.spesa-scope .catman-name{flex:1;min-width:0;height:46px;font-family:inherit;font-size:15px;font-weight:700;color:#1F2937;padding:0 14px;border:1.5px solid #E5E7EB;border-radius:13px;background:#FAFBFC;outline:none;transition:border-color .15s,background .15s}
.spesa-scope .catman-name:focus{border-color:var(--e);background:#fff}
.spesa-scope .catman-del{width:40px;height:46px;flex:none;border:none;background:transparent;color:#CBD5E1;font-size:15px;cursor:pointer;border-radius:13px;transition:all .15s}
.spesa-scope .catman-del:active{background:#FEE2E2;color:#DC2626}
.spesa-scope .catman-spacer{width:8px;flex:none}
.spesa-scope .catman-add{width:100%;border:none;border-radius:50px;padding:14px;background:var(--e-g);color:#fff;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 5px 16px rgba(219,39,119,.32);transition:transform .12s}
.spesa-scope .catman-add:active{transform:scale(.97)}

/* toast */
.spesa-scope .sp-toast{position:fixed;left:50%;bottom:88px;transform:translateX(-50%) translateY(20px);background:#111827;color:#fff;font-size:13.5px;font-weight:700;padding:11px 18px;border-radius:50px;box-shadow:0 10px 30px rgba(0,0,0,.3);opacity:0;pointer-events:none;transition:all .25s;z-index:1000;max-width:90%;text-align:center}
.spesa-scope .sp-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
`;
