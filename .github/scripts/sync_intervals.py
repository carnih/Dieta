# -*- coding: utf-8 -*-
"""Sync allenamenti: intervals.icu -> Firebase Realtime Database (training/activities).
Legge tutte le attivita' da intervals.icu, le normalizza nello schema della dashboard
e le scrive (idempotente, chiave = id attivita').
Variabili d'ambiente: INTERVALS_ATHLETE, INTERVALS_KEY, FB_EMAIL, FB_PASSWORD.
DRY_RUN=1 -> non scrive su Firebase, stampa solo un riepilogo (per test)."""
import os, json, base64, urllib.request, urllib.error, io, csv, sys
from datetime import datetime
sys.setrecursionlimit(20000)

ATH   = os.environ['INTERVALS_ATHLETE']
KEY   = os.environ['INTERVALS_KEY']
DRY   = os.environ.get('DRY_RUN') == '1'
FB_APIKEY = os.environ.get('FB_APIKEY', 'AIzaSyAIhOcx7IPpTIRjnbbmjhKZ2bWRAjt2JT4')
FB_DB     = os.environ.get('FB_DB', 'https://dieta-b7804-default-rtdb.europe-west1.firebasedatabase.app')
TRACK_V   = 3   # schema tracce: bump quando cambia il calcolo -> auto-rigenerazione incrementale

def http(url, data=None, headers=None, method=None):
    h = {'User-Agent': 'Mozilla/5.0 (dieta-sync; +https://github.com/carnih/Dieta)'}
    if headers: h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', 'ignore')[:400]
        raise SystemExit(f"Errore HTTP {e.code} su {url.split('?')[0]} -> {body}")

SPORT = {'Run':'corsa','VirtualRun':'corsa','TrailRun':'corsa',
         'Ride':'bici','VirtualRide':'bici','GravelRide':'bici','MountainBikeRide':'bici',
         'Swim':'nuoto','OpenWaterSwim':'nuoto',
         'WeightTraining':'forza','Workout':'cardio',
         'Padel':'padel','Transition':'transizione',
         'Snowboard':'snowboard','AlpineSki':'snowboard','Walk':'walk','Hike':'hike'}

def mmss(x):
    if not x or x <= 0: return ''
    m = int(x); s = int(round((x - m) * 60))
    if s == 60: m += 1; s = 0
    return f"{m}:{s:02d}"

def num(v):
    try: return float(v)
    except: return None

# ── traccia GPS: semplificazione (Douglas-Peucker), profilo altimetrico, salite ──
def _pdist(p, a, b):
    x, y = p; x1, y1 = a; x2, y2 = b; dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0: return ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
    t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy); px, py = x1 + t * dx, y1 + t * dy
    return ((x - px) ** 2 + (y - py) ** 2) ** 0.5

def _dp(pts, eps):
    if len(pts) < 3: return pts
    dmax = 0.0; idx = 0; a, b = pts[0], pts[-1]
    for i in range(1, len(pts) - 1):
        d = _pdist(pts[i], a, b)
        if d > dmax: dmax = d; idx = i
    if dmax > eps: return _dp(pts[:idx + 1], eps)[:-1] + _dp(pts[idx:], eps)
    return [pts[0], pts[-1]]

def _downsample(dist, alt, n=80):
    m = min(len(dist), len(alt))
    if m == 0: return []
    if m <= n: return [[round(dist[i] / 1000, 3), round(alt[i], 1)] for i in range(m)]
    out = []; step = m / float(n)
    for k in range(n):
        i = int(k * step); out.append([round(dist[i] / 1000, 3), round(alt[i], 1)])
    out.append([round(dist[m - 1] / 1000, 3), round(alt[m - 1], 1)]); return out

def _detect_climbs(dist, alt, tim=None, hr=None, cad=None):
    n = min(len(dist), len(alt))
    if n < 3: return []
    climbs = []; i = 0
    while i < n - 1:
        if alt[i + 1] <= alt[i]: i += 1; continue
        s = i; j = i; maxj = i
        while j < n - 1:
            if alt[j + 1] >= alt[maxj] - 8:
                j += 1
                if alt[j] > alt[maxj]: maxj = j
            else: break
        gain = alt[maxj] - alt[s]; length = dist[maxj] - dist[s]
        if gain >= 20 and length >= 300:
            dur = (tim[maxj] - tim[s]) if (tim and maxj < len(tim)) else 0
            hrs = [hr[k] for k in range(s, maxj + 1) if hr and k < len(hr) and hr[k]]
            cads = [cad[k] for k in range(s, maxj + 1) if cad and k < len(cad) and cad[k]]
            gmax = gain / length * 100; k = s
            while k < maxj:
                j2 = k
                while j2 < maxj and dist[j2] - dist[k] < 100: j2 += 1
                dd = dist[j2] - dist[k]
                if dd >= 50:
                    g = (alt[j2] - alt[k]) / dd * 100
                    if g > gmax: gmax = g
                k = j2 if j2 > k else k + 1
            climbs.append({'km': round(dist[s] / 1000, 1), 'len_m': round(length),
                           'gain_m': round(gain), 'grad': round(gain / length * 100, 1),
                           'gmax': round(gmax, 1), 'dur_s': round(dur),
                           'hr': round(sum(hrs) / len(hrs)) if hrs else '',
                           'hrmax': round(max(hrs)) if hrs else '',
                           'cad': round(sum(cads) / len(cads)) if cads else '',
                           'vam': round(gain / (dur / 3600)) if dur > 0 else '',
                           'spd': round((length / 1000) / (dur / 3600), 1) if dur > 0 else ''})
        i = max(maxj, s + 1)
    return climbs

def build_track(text):
    lat = []; lng = []; alt = []; dist = []; tim = []; hr = []; cad = []
    for row in csv.DictReader(io.StringIO(text)):
        la = row.get('lat'); ln = row.get('lng')
        if not la or not ln: continue
        try:
            lat.append(float(la)); lng.append(float(ln))
            alt.append(float(row.get('altitude') or 0)); dist.append(float(row.get('distance') or 0))
            tim.append(float(row.get('time') or 0)); hr.append(float(row.get('heartrate') or 0))
            cad.append(float(row.get('cadence') or 0))
        except Exception: pass
    if len(lat) < 2: return None
    pts = [[round(lat[i], 5), round(lng[i], 5)] for i in range(len(lat))]
    has_alt = any(alt)
    return {'v': TRACK_V,
            'track': _dp(pts, 0.00015),
            'elev': _downsample(dist, alt) if has_alt else [],
            'climbs': _detect_climbs(dist, alt, tim, hr, cad) if has_alt else [],
            'gain': round(sum(max(0, alt[i + 1] - alt[i]) for i in range(len(alt) - 1))) if has_alt else 0}

# 1) leggi attivita' da intervals.icu (o da file locale per test: INTERVALS_FILE)
auth = base64.b64encode(('API_KEY:' + KEY).encode()).decode()
_src = os.environ.get('INTERVALS_FILE')
if _src:
    with open(_src, encoding='utf-8-sig') as f:
        acts = json.load(f)
else:
    acts = json.loads(http(f'https://intervals.icu/api/v1/athlete/{ATH}/activities?oldest=2020-01-01&newest=2035-01-01',
                           headers={'Authorization': 'Basic ' + auth}))

out = {}
for a in acts:
    sid = str(a.get('id') or '').replace('.', '_').replace('/', '_')
    if not sid: continue
    t = a.get('type') or ''
    disc = SPORT.get(t, 'altro')
    sd = a.get('start_date_local') or ''
    try: dt = datetime.fromisoformat(sd)
    except Exception: dt = None
    dur = (num(a.get('moving_time')) or 0) / 60.0
    dist_m = num(a.get('distance')) or 0
    km = dist_m / 1000.0
    rec = {
        'id': sid,
        'data': dt.strftime('%Y-%m-%d') if dt else '',
        'ora': dt.strftime('%H:%M') if dt else '',
        'mese': dt.strftime('%Y-%m') if dt else '',
        'anno_sett': dt.strftime('%G-W%V') if dt else '',
        'disciplina': disc,
        'tipo_garmin': t.lower(),
        'nome': a.get('name') or '',
        'durata_min': round(dur, 1),
        'distanza_km': round(km, 2) if km > 0 else '',
        'passo_corsa_min_km': mmss(dur / km) if (disc == 'corsa' and km > 0.05) else '',
        'velocita_bici_kmh': round(km / (dur / 60), 1) if (disc == 'bici' and dur > 0 and km > 0.05) else '',
        'passo_nuoto_min_100m': mmss(dur / (dist_m / 100)) if (disc == 'nuoto' and dist_m > 20) else '',
        'fc_media': round(num(a.get('average_heartrate'))) if a.get('average_heartrate') else '',
        'fc_max': round(num(a.get('max_heartrate'))) if a.get('max_heartrate') else '',
        'carico': round(num(a.get('icu_training_load'))) if a.get('icu_training_load') else '',
        'ctl': round(num(a.get('icu_ctl'))) if a.get('icu_ctl') else '',
        'atl': round(num(a.get('icu_atl'))) if a.get('icu_atl') else '',
        'disliv_m': round(num(a.get('total_elevation_gain'))) if a.get('total_elevation_gain') else 0,
        'potenza_media_w': round(num(a.get('icu_average_watts'))) if a.get('icu_average_watts') else '',
        'cadenza_corsa_spm': round(num(a.get('average_cadence'))) if (disc == 'corsa' and a.get('average_cadence')) else '',
        'calorie': a.get('calories') or '',
        'rpe': a.get('perceived_exertion') or a.get('icu_rpe') or '',
        'feel': a.get('feel') or '',
    }
    zt = a.get('icu_hr_zone_times') or []
    for i in range(1, 6):
        rec['zona%d_min' % i] = round((num(zt[i - 1]) or 0) / 60, 1) if (i - 1) < len(zt) else 0
    out[sid] = rec

print(f"Lette {len(acts)} attivita' da intervals.icu, normalizzate {len(out)}.")

if DRY:
    import collections
    by = collections.Counter(r['disciplina'] for r in out.values())
    print("Per disciplina:", dict(by))
    sample = sorted(out.values(), key=lambda r: r['data'])[-3:]
    print("Esempio (ultime 3):")
    for r in sample:
        print(" ", {k: r[k] for k in ('data', 'disciplina', 'nome', 'durata_min', 'distanza_km',
              'passo_corsa_min_km', 'velocita_bici_kmh', 'passo_nuoto_min_100m', 'fc_media', 'carico', 'ctl')})
    raise SystemExit(0)

# salvaguardia: se non ho letto attivita' NON sovrascrivo (evita di azzerare lo storico
# in caso di risposta vuota/errore da intervals.icu)
if not out:
    raise SystemExit("0 attivita' normalizzate: non sovrascrivo training/activities.")

# 2) login Firebase come utente (rispetta le regole: scrive come account autorizzato)
signin = json.loads(http(
    f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FB_APIKEY}',
    data=json.dumps({'email': os.environ['FB_EMAIL'], 'password': os.environ['FB_PASSWORD'],
                     'returnSecureToken': True}).encode(),
    headers={'Content-Type': 'application/json'}, method='POST'))
if 'idToken' not in signin:
    raise SystemExit("Login Firebase fallito: " + json.dumps(signin)[:300])
idtok = signin['idToken']

# 3) scrivi (replace dell'intero nodo, idempotente)
http(f'{FB_DB}/training/activities.json?auth={idtok}',
     data=json.dumps(out).encode(), headers={'Content-Type': 'application/json'}, method='PUT')
print(f"OK: scritte {len(out)} attivita' su Firebase (training/activities).")

# 4) TRACCE GPS (mappa + profilo + salite) — incrementale: solo attivita' nuove con GPS
force = os.environ.get('FORCE_TRACKS') in ('1', 'true', 'True', 'yes', 'on')
try:
    existing = {} if force else (json.loads(http(f'{FB_DB}/training/tracks.json?auth={idtok}')) or {})
except Exception:
    existing = {}
cap = 10**9 if force else 30   # auto-heal: max 30 (ri)generazioni per run (le vecchie si aggiornano in pochi giorni)
added = 0
for a in acts:
    sid = str(a.get('id') or '')
    if not sid: continue
    sts = a.get('stream_types') or []
    if isinstance(sts, str): sts = sts.split(',')
    if 'latlng' not in sts: continue
    cur = existing.get(sid)
    if isinstance(cur, dict) and cur.get('v') == TRACK_V: continue   # gia' allo schema corrente
    try:
        text = http(f'https://intervals.icu/api/v1/activity/{sid}/streams.csv',
                    headers={'Authorization': 'Basic ' + auth}).decode('utf-8', 'ignore')
        tr = build_track(text)
        if tr:
            http(f'{FB_DB}/training/tracks/{sid}.json?auth={idtok}',
                 data=json.dumps(tr).encode(), headers={'Content-Type': 'application/json'}, method='PUT')
            added += 1
            if added >= cap: break
    except Exception as e:
        print(f"  traccia {sid} saltata: {e}")
print(f"OK: {added} tracce (ri)generate (schema v{TRACK_V}); presenti su DB: {len(existing)}.")
