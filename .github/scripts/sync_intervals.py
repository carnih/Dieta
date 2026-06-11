# -*- coding: utf-8 -*-
"""Sync allenamenti: intervals.icu -> Firebase Realtime Database (training/activities).
Legge tutte le attivita' da intervals.icu, le normalizza nello schema della dashboard
e le scrive (idempotente, chiave = id attivita').
Variabili d'ambiente: INTERVALS_ATHLETE, INTERVALS_KEY, FB_EMAIL, FB_PASSWORD.
DRY_RUN=1 -> non scrive su Firebase, stampa solo un riepilogo (per test)."""
import os, json, base64, urllib.request
from datetime import datetime

ATH   = os.environ['INTERVALS_ATHLETE']
KEY   = os.environ['INTERVALS_KEY']
DRY   = os.environ.get('DRY_RUN') == '1'
FB_APIKEY = os.environ.get('FB_APIKEY', 'AIzaSyAIhOcx7IPpTIRjnbbmjhKZ2bWRAjt2JT4')
FB_DB     = os.environ.get('FB_DB', 'https://dieta-b7804-default-rtdb.europe-west1.firebasedatabase.app')

def http(url, data=None, headers=None, method=None):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

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

# 1) leggi attivita' da intervals.icu (o da file locale per test: INTERVALS_FILE)
_src = os.environ.get('INTERVALS_FILE')
if _src:
    with open(_src, encoding='utf-8-sig') as f:
        acts = json.load(f)
else:
    auth = base64.b64encode(('API_KEY:' + KEY).encode()).decode()
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
        'vo2max': '', 'te_aerobico': '', 'te_anaerobico': '',
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

# 2) login Firebase come utente (rispetta le regole: scrive come account autorizzato)
signin = json.loads(http(
    f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FB_APIKEY}',
    data=json.dumps({'email': os.environ['FB_EMAIL'], 'password': os.environ['FB_PASSWORD'],
                     'returnSecureToken': True}).encode(),
    headers={'Content-Type': 'application/json'}, method='POST'))
idtok = signin['idToken']

# 3) scrivi (replace dell'intero nodo, idempotente)
http(f'{FB_DB}/training/activities.json?auth={idtok}',
     data=json.dumps(out).encode(), headers={'Content-Type': 'application/json'}, method='PUT')
print(f"OK: scritte {len(out)} attivita' su Firebase (training/activities).")
