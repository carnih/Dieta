// VIEWER PDF SCHEDA — overlay che legge/scrive `schedePdf/{prog}` come data-URL base64
// (repo.get / repo.set). Mostra il PDF in un <iframe> via blob URL. Upload da input file
// con guard a ~1 MB. Portato FEDELE dal monolite (renderPdfModal + open/close/upload).

import { useEffect, useRef, useState } from 'react';
import { repo } from '@/data';
import { esc } from '@/lib/utils';
import type { Allenamenti } from '@/lib/types';

type Prog = 'forza' | 'tri';

interface PdfState {
  loading: boolean;
  url: string | null; // blob object URL
  error: string | null;
}

export interface PdfViewerProps {
  prog: Prog;
  schede: Allenamenti;
  onClose: () => void;
  /** Notifica salvataggi riusciti (toast lato pagina). */
  onToast?: (msg: string) => void;
}

/** data-URL → blob object URL (revocato al cambio/smontaggio dal chiamante). */
async function dataUrlToObjUrl(dataUrl: string): Promise<string> {
  const b = await (await fetch(dataUrl)).blob();
  return URL.createObjectURL(b);
}

export default function PdfViewer({ prog, schede, onClose, onToast }: PdfViewerProps) {
  const [state, setState] = useState<PdfState>({ loading: true, url: null, error: null });
  const fileRef = useRef<HTMLInputElement | null>(null);
  // URL blob corrente, per revocarlo quando ne creo uno nuovo o smonto.
  const blobRef = useRef<string | null>(null);

  const setBlob = (u: string | null) => {
    if (blobRef.current && blobRef.current !== u) URL.revokeObjectURL(blobRef.current);
    blobRef.current = u;
  };

  // Caricamento iniziale del PDF salvato (one-shot via repo.get).
  useEffect(() => {
    let alive = true;
    setState({ loading: true, url: null, error: null });
    repo
      .get<string>('schedePdf/' + prog)
      .then(async (data) => {
        if (!alive) return;
        if (data) {
          const u = await dataUrlToObjUrl(data);
          if (!alive) {
            URL.revokeObjectURL(u);
            return;
          }
          setBlob(u);
          setState({ loading: false, url: u, error: null });
        } else {
          setState({ loading: false, url: null, error: null });
        }
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : String(e);
        setState({ loading: false, url: null, error: 'Errore lettura: ' + msg });
      });
    return () => {
      alive = false;
    };
  }, [prog]);

  // Revoca il blob residuo allo smontaggio.
  useEffect(() => {
    return () => setBlob(null);
  }, []);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 1024 * 1024) {
      setState({
        loading: false,
        url: blobRef.current,
        error: 'PDF troppo grande (' + Math.round(f.size / 1024) + ' KB). Max ~1 MB.',
      });
      return;
    }
    setState({ loading: true, url: null, error: null });
    const r = new FileReader();
    r.onload = async () => {
      try {
        const dataUrl = String(r.result);
        await repo.set('schedePdf/' + prog, dataUrl);
        const u = await dataUrlToObjUrl(dataUrl);
        setBlob(u);
        setState({ loading: false, url: u, error: null });
        onToast?.('PDF caricato ✓');
      } catch (err: unknown) {
        const msg =
          (err as { code?: string })?.code ||
          (err instanceof Error ? err.message : String(err));
        setState({ loading: false, url: null, error: 'Salvataggio non riuscito (' + msg + ').' });
      }
    };
    r.onerror = () => setState({ loading: false, url: null, error: 'Lettura file non riuscita.' });
    r.readAsDataURL(f);
  };

  const P = schede[prog] || ({} as Allenamenti[Prog]);
  const { loading, url, error } = state;

  return (
    <div
      className="pdf-ov"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pdf-card">
        <div className="pdf-head">
          <b>📎 {P.nome || prog}</b>
          <button className="pdf-x" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="pdf-msg">Carico…</div>
        ) : url ? (
          <>
            <iframe className="pdf-frame" src={url} title="Scheda PDF" />
            <div className="pdf-actions">
              <a className="al-btn" href={url} target="_blank" rel="noopener noreferrer">
                ↗ Apri
              </a>
              <button className="al-btn" onClick={() => fileRef.current?.click()}>
                Sostituisci
              </button>
            </div>
          </>
        ) : (
          <div className="pdf-msg">
            {error ? esc(error) : 'Nessun PDF caricato per questa scheda.'}
            <button
              className="al-btn"
              style={{ marginTop: 8 }}
              onClick={() => fileRef.current?.click()}
            >
              📎 Carica PDF
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={onUpload}
        />
      </div>
    </div>
  );
}
