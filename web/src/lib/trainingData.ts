// Schede e logica programmi ALLENAMENTI, portate VERBATIM dal monolite index.html.
// Le funzioni di logica ricevono lo stato per argomento (niente globali): la vista
// le invoca passando `schedule` / `allenamentiCfg` letti dallo store.

import { mondayOf } from '@/lib/date';
import type {
  Allenamenti,
  AllenamentiCfg,
  AlProgCfg,
  Schedule,
  WeekdayKey,
} from '@/lib/types';

export { mondayOf };

// ══════════════════════════════════════════
//  ALLENAMENTI (schede dal preparatore)
// ══════════════════════════════════════════
export const ALLENAMENTI: Allenamenti = {
  forza: {
    nome: 'Forza · S&C',
    coach: 'Paolo Morosini',
    durata: 8,
    note: 'NIC S&C Program · preparatore atletico Paolo Morosini. Cue del PT riportate fedeli (carichi, reps dal cedimento, progressioni).',
    weeks: [
      {
        titolo: 'Settimana 1',
        blocchi: [
          { nome: "Warm-up · EMOM 10'", righe: '10 burpees · 16 affondi avanti · 8 pull ups · 5 high jump squat · 30" wall sit' },
          { nome: 'Pliometria', righe: '1x6 box jump con atterraggio sulla box in accosciata' },
          { nome: 'Squat', righe: "10' per scaldare a front squat · poi front squat ogni 3' x4 round @ 80% 1RM" },
          { nome: 'Spinta (superset)', righe: "Shoulder press (stessa modalità: ogni 3' x4) in superset con Hip thrust 3x10 + Panca piana manubri 3x10 · rest 1'" },
          { nome: 'A chiudere', righe: '6x6 single leg deadlift con 2 kb' },
          { nome: 'Tirata (superset)', righe: 'Rematore bilanciere 4x8 in superset con 5 dips parallele + 5+5 step ups manubri · recupero 90"' },
          { nome: 'Core · Tabata', righe: 'hollow rocks / superman' },
        ],
      },
      {
        titolo: 'Settimana 2',
        blocchi: [
          { nome: 'Warm-up 2x', righe: "1' salti corda · 10m affondi camminati · 8 thruster manubri · 10 face pull (elastico o cavi) · 10 push ups · 20\" hollow con disco" },
          { nome: "Fase 1 · EMOM 10'", righe: 'min dispari: 6-5-4-4-3 back squat · min pari: 6/8 push ups · carichi graduali' },
          { nome: 'Fase 2 · ogni 3\'30" x4', righe: '8 squat (almeno 2 reps prima del cedimento) in superset con 6/8 hand release push ups' },
          { nome: "Fase 3 · EMOM 10'", righe: 'min dispari: 6-5-4-3-3 bench press · min pari: 8/10 alzate laterali (leggero, sali graduale)' },
          { nome: "Fase 4 · ogni 3' x4", righe: '8 bench press (2 reps al cedimento) in superset con 6 alzate laterali (più pesanti di prima)' },
          { nome: 'Fase 5 · ogni 2\'30" x4', righe: '12 box step ups heavy (6+6)' },
          { nome: "Fase 6 · ogni 3' x4", righe: '6/12 pull ups · 15 rdl manubri' },
        ],
      },
      {
        titolo: 'Settimana 3',
        blocchi: [
          { nome: 'Warm-up', righe: 'vedi warm-up settimana scorsa' },
          { nome: "EMOM 10'", righe: '1) 6-5-4-4-3 back squat (sali in progressioni) · 2) 6/8 push ups' },
          { nome: 'Strength · ogni 3\'30" x4', righe: '8 back squat (fermati almeno 2 reps prima del cedimento) in superset con 6/8 hand release push ups' },
          { nome: "EMOM 10'", righe: '1) 6-5-4-3-3 bench press (sali in progressione) · 2) 8/10 affondi avanti manubri' },
          { nome: "Ogni 3' x4", righe: '8 shoulder press (2 reps prima del cedimento) in superset con 6 alzate laterali pesanti' },
          { nome: "Ogni 3' x4", righe: '6-12 trazioni · 15 hip thrust' },
        ],
      },
      {
        titolo: 'Settimana 4',
        blocchi: [
          { nome: 'Warm-up 2x', righe: "1' salti corda · 10m overhead walking lunges db/bb · 8 thruster manubri · 10 banded face pull · 8 box jump 50cm" },
          { nome: "EMOM 10'", righe: '4 seated box jump · 4 lanci palla medica dal petto' },
          { nome: "EMOM 10'", righe: '1) 6-5-4-4-3 back squat · 2) 6/8 push ups' },
          { nome: 'Ogni 3\'30" x4', righe: '8 trap bar deadlift (2 reps di riserva) · 6/8 push press manubri' },
          { nome: "EMOM 10'", righe: '1) 6-5-4-3-3 bench press · 2) rest' },
          { nome: "Ogni 3' x4", righe: '8 bench press (2 reps di riserva) · 6+6 one leg rdl manubrio' },
          { nome: 'Ogni 2\'30" x4', righe: '6+6 step ups' },
        ],
      },
      {
        titolo: 'Settimana 5',
        blocchi: [
          { nome: 'Warm-up 2x', righe: "1' salti corda · 10m overhead w.lunges db/bb · 8 thruster manubri · 10 banded face pull · 8 box jump 50cm · 2x(10+10) side plank clamshell" },
          { nome: "EMOM 10'", righe: '4 seated box jump · 4 lat slam ball' },
          { nome: "EMOM 10'", righe: '6-5-4-4-3 back squat (carichi inferiori alle scorse settimane, come attivazione) · min dispari: 6 push ups' },
          { nome: 'Ogni 2\'30" x4', righe: '8 back squat (4-5 reps prima del cedimento) subito seguito da 8+8 rematore unilaterale manubrio' },
          { nome: "EMOM 10'", righe: '6-5-4-3-3 shoulder press · 2° minuto: rest' },
          { nome: "Ogni 3' x4", righe: '8 bench press (4 reps al cedimento) + 6 lateral raises carico medio' },
          { nome: 'Ogni 2\'30" x4', righe: '6+6 step ups' },
        ],
      },
      {
        titolo: 'Settimana 6',
        blocchi: [
          { nome: 'Warm-up 2x', righe: "1' salti corda · 10m overhead w.lunges db/bb · 8 thruster manubri · 10 banded face pull · 8 box jump 50cm" },
          { nome: "PLYO · EMOM 10'", righe: '1) 4 balzi ostacoli · 2) 4 slam ball' },
          { nome: "EMOM 10'", righe: '1) 6-5-4-4-3 back squat · 2) 8 push press manubri' },
          { nome: 'Ogni 2\'30" x4', righe: '7 hip thrust (2 reps prima del cedimento) subito seguito da 6 chin ups' },
          { nome: "EMOM 10'", righe: '1) 6-5-4-3-3 shoulder press · 2) 15 croci con manubri' },
          { nome: "Ogni 3' x4", righe: '7 rematore presa prona con bilanciere · 6 alzate laterali peso medio' },
          { nome: 'Finisher', righe: "3x10 stacco da terra · 1' rest" },
        ],
      },
      {
        titolo: 'Settimana 7',
        blocchi: [
          { nome: "Warm-up · EMOM 6'", righe: "1' row · 12 ring row / aus. pull · 8 squat jumps" },
          { nome: 'Forza', righe: "10' back squat build up · poi 3x: 5 back squat 70% 1RM (o 8 rdl) subito seguito da 10 push ups + 10 bent over row db · 2' rest" },
          { nome: 'Metcon · 4x (RPE 7-8)', righe: '40m farmer carry · 10 renegade row · 10 push press manubri · 10 curl manubri · 10 skullcrusher manubri · 20m affondi con manubri' },
        ],
      },
      {
        titolo: 'Settimana 8',
        blocchi: [
          { nome: 'Warm-up', righe: "5' easy bike · 2x(10 goblet squat · 10 back lunges · 20m farmer carry) · 5' dynamic mobility" },
          { nome: '4x', righe: "6+6 bulgarian split squat manubri · 6+6 one leg rdl con manubrio · 1'30\" rest" },
          { nome: '6x', righe: "6 trazioni · 6 dips · 1' rest" },
          { nome: '4x', righe: '12 hip thrust · 20 polpacci da rialzo' },
          { nome: 'Finisher 28-21-15-9', righe: 'push ups · band face pulls' },
        ],
      },
    ],
  },
  tri: {
    nome: 'Triathlon · Mesociclo 9',
    coach: 'Paolo Morosini',
    durata: 4,
    obiettivi:
      "Durabilità e resistenza specifica · ↑ tempo in sella · corsa post-bike · nutrizione gara · continuità nuoto. Nota PT: nei brick 40→60 g CHO/h crescenti (S1 40-50 · S2 50-60 · S3 60) per allenare l'intestino, non per massimizzare l'assorbimento.",
    weeks: [
      {
        titolo: 'Settimana 1',
        note: 'Brick: 40-50 g CHO/h',
        sessioni: [
          { disc: 'nuoto', blocchi: [{ nome: 'Riscaldamento', righe: '300 easy · 100 tavoletta · 100 pull buoy' }, { nome: 'Tecnica', righe: '4x50 con pinnette · 20" rest' }, { nome: 'Main set', righe: '5x400 @ ritmo olimpico · rec 30-45"' }, { nome: 'Defaticamento', righe: '100 easy' }] },
          { disc: 'bici', blocchi: [{ nome: 'Sessione', righe: "20' facili · 3x15' PE7 (rec attivo 5') · 20' continui PE6 · 10' defaticamento" }] },
          { disc: 'brick', blocchi: [{ nome: "Bici 1h45'", righe: "60' PE6 · 30' PE7 · 15' PE7-8" }, { nome: "→ Corsa 40' (transiz. immediata)", righe: "15'@5'55 · 15'@5'50 · 10'@5'45" }] },
          { disc: 'corsa', blocchi: [{ nome: "Corsa aggiuntiva 50'", righe: "facile · 6'05-6'20/km" }] },
        ],
      },
      {
        titolo: 'Settimana 2',
        note: 'Brick: 50-60 g CHO/h',
        sessioni: [
          { disc: 'nuoto', blocchi: [{ nome: 'Riscaldamento', righe: '300 easy · 100 tavoletta · 100 pull' }, { nome: 'Main set', righe: "2x1000 m @ ritmo gara olimpico · rec 1'/2'" }] },
          { disc: 'bici', blocchi: [{ nome: 'Sessione', righe: "25' easy · 2x20' PE7 (rec attivo 5') · 25' PE6" }] },
          { disc: 'brick', blocchi: [{ nome: "Bici 2h", righe: 'PE6-7' }, { nome: "→ Corsa 45'", righe: "20'@5'55 · 15'@5'50 · 10'@5'45" }] },
          { disc: 'corsa', blocchi: [{ nome: "Corsa aggiuntiva 45'", righe: "facile · ultimi 5': 30\" allungando / 30\" lenti" }] },
        ],
      },
      {
        titolo: 'Settimana 3 · chiave',
        note: 'Brick: 60 g CHO/h',
        sessioni: [
          { disc: 'nuoto', blocchi: [{ nome: 'Riscaldamento', righe: '400 easy · 100 tavoletta · 100 pull' }, { nome: 'Main set', righe: '3x700 @ ritmo gara olimpico · rec 1\'/1\'30"' }] },
          { disc: 'brick', blocchi: [{ nome: "Brick lungo · Bici 2h15'", righe: "75' PE6 · 45' PE7 · 15' PE7-8" }, { nome: "→ Corsa 50'", righe: "20'@5'55 · 20'@5'50 · 10'@5'45" }] },
          { disc: 'corsa', blocchi: [{ nome: "Corsa aggiuntiva 35'", righe: 'molto facile' }] },
        ],
      },
      {
        titolo: 'Settimana 4 · scarico',
        sessioni: [
          { disc: 'nuoto', blocchi: [{ nome: 'Sessione', righe: '1800 m molto sciolto e costante' }] },
          { disc: 'bici', blocchi: [{ nome: 'Sessione', righe: "75' PE5-6" }] },
          { disc: 'corsa', blocchi: [{ nome: 'Sessione', righe: "40' facile" }] },
        ],
      },
    ],
  },
};

/** Mappa disciplina → [emoji, label]. */
export const DISC: Record<string, [string, string]> = {
  nuoto: ['🏊', 'Nuoto'],
  bici: ['🚴', 'Bici'],
  corsa: ['🏃', 'Corsa'],
  forza: ['🏋️', 'Forza'],
  brick: ['🔥', 'Brick'],
};

/** Config di default dei programmi (date di partenza). */
export const AL_CFG_DEF: Record<'forza' | 'tri', AlProgCfg> = {
  forza: { start: '2026-05-18', shift: 0 },
  tri: { start: '2026-06-01', shift: 0 },
};

/** Opzione di pianificazione settimanale (dieta associata + sessione). */
export interface SchedOpt {
  id: string;
  label: string;
  diet: string;
  sess: [string, string | null] | null;
}

export const SCHED_OPTS: SchedOpt[] = [
  { id: 'corsa', label: '🏃 Corsa', diet: 'corsa', sess: ['tri', 'corsa'] },
  { id: 'bici', label: '🚴 Bici', diet: 'bici', sess: ['tri', 'bici'] },
  { id: 'palestra', label: '🏋️ Palestra', diet: 'palestra', sess: ['forza', null] },
  { id: 'nuoto', label: '🏊 Nuoto', diet: 'palestra', sess: ['tri', 'nuoto'] },
  { id: 'padel', label: '🏓 Padel', diet: 'palestra', sess: null },
  { id: 'brick', label: '🔥 Brick', diet: 'combinato', sess: ['tri', 'brick'] },
  { id: 'riposo', label: '😴 Riposo', diet: 'riposo', sess: null },
];

/** Opzione di pianificazione per id (fallback a "riposo"). */
export function schedOpt(id: string): SchedOpt {
  return (
    SCHED_OPTS.find((o) => o.id === id) ??
    (SCHED_OPTS.find((o) => o.id === 'riposo') as SchedOpt)
  );
}

/**
 * Attività pianificate nel giorno: normalizza a array, migra legacy
 * "combinato" → "brick" e scarta vuoti/"riposo".
 */
export function getSchedDays(schedule: Schedule, wd: WeekdayKey): string[] {
  let v = schedule && schedule[wd];
  if (!v) return [];
  if (typeof v === 'string') v = [v];
  return v.map((x) => (x === 'combinato' ? 'brick' : x)).filter((x) => x && x !== 'riposo');
}

/** Dieta del giorno: 2+ → combinato; brick → combinato; 1 → quella; 0 → riposo. */
export function getTrain(schedule: Schedule, wd: WeekdayKey): string {
  const a = getSchedDays(schedule, wd);
  if (a.length >= 2) return 'combinato';
  if (a.length === 1) return schedOpt(a[0]).diet;
  return 'riposo';
}

/** Etichetta riassuntiva delle attività del giorno. */
export function trainLabel(schedule: Schedule, wd: WeekdayKey): string {
  const a = getSchedDays(schedule, wd);
  if (!a.length) return '😴 Riposo';
  return a.map((id) => schedOpt(id).label).join(' + ');
}

/** Config effettiva di un programma (default + override store). */
export function alCfg(allenamentiCfg: AllenamentiCfg, prog: 'forza' | 'tri'): AlProgCfg {
  const d = AL_CFG_DEF[prog];
  const c = (allenamentiCfg && allenamentiCfg[prog]) || {};
  return { start: c.start || d.start, shift: c.shift != null ? c.shift : d.shift };
}

/** Indice (0-based) della settimana corrente del programma, clampato a [0, durata-1]. */
export function settCorrente(allenamentiCfg: AllenamentiCfg, prog: 'forza' | 'tri'): number {
  const cfg = alCfg(allenamentiCfg, prog);
  const dur = ALLENAMENTI[prog].durata;
  const start = mondayOf(cfg.start + 'T00:00:00');
  const now = mondayOf(new Date());
  if (isNaN(start.getTime())) return 0; // data malformata: non rompere la settimana
  const wk = Math.round((now.getTime() - start.getTime()) / (7 * 86400000)) - (cfg.shift || 0);
  return Math.max(0, Math.min(dur - 1, wk));
}
