# Suncast 3D HTTP API

A small read-only JSON API for **sun position** and **daily daylight metrics** at
any coordinate and date. It is pure astronomy math (the
[SunCalc](https://github.com/mourner/suncalc) algorithms) — it needs **no API
keys**, touches no map data, and has no side effects.

It is served by the same `server.js` as the 3D viewer, under `/api`.

```
npm start                       # http://localhost:3003  → viewer + API
curl http://localhost:3003/api  # self-describing index
```

- **Auth:** none.
- **CORS:** `Access-Control-Allow-Origin: *` on every `/api` route, so browser
  JS on any origin can call it too.
- **Caching:** responses are deterministic; `Cache-Control: public, max-age=3600`.
- **Scope:** *open-sky* only. Results assume a flat, unobstructed horizon —
  terrain, neighbouring buildings, trees and walls are **not** considered.

---

## `GET /api/sun`

Instantaneous sun position for one moment.

| Param | Required | Default | Notes |
|-------|----------|---------|-------|
| `lat` | yes | — | −90 … 90 |
| `lng` | yes | — | −180 … 180 |
| `datetime` | no | now | Any ISO-8601 instant, e.g. `2026-06-21T14:30:00Z` or `2026-06-21T14:30:00+02:00` |

```bash
curl "http://localhost:3003/api/sun?lat=48.8530&lng=2.3499&datetime=2026-06-21T12:00:00Z"
```

```json
{
  "query": { "lat": 48.853, "lng": 2.3499, "datetime": "2026-06-21T12:00:00.000Z" },
  "altitudeDeg": 64.54,
  "azimuthDeg": 183.95,
  "isNight": false
}
```

| Field | Meaning |
|-------|---------|
| `altitudeDeg` | Sun angle above the horizon. Negative = below the horizon. |
| `azimuthDeg` | Compass bearing of the sun: `0` = N, `90` = E, `180` = S, `270` = W. |
| `isNight` | `true` when `altitudeDeg <= 0`. |

---

## `GET /api/daylight`

Daylight summary for one **calendar date** at a location.

| Param | Required | Default | Notes |
|-------|----------|---------|-------|
| `lat` | yes | — | −90 … 90 |
| `lng` | yes | — | −180 … 180 |
| `date` | no | today (UTC) | `YYYY-MM-DD`. Must be a real date. |
| `tzOffset` | no | `round(lng / 15)` | UTC offset in hours for interpreting `date` and formatting the output times. May be fractional (`5.5`). **No time-zone database** — pass the real offset (incl. DST) if you need wall-clock accuracy. |
| `minAltitude` | no | `0` | Degrees. The sun must be at least this high to count toward `directSunHours`. Try `6` for "usable" sun, higher for solar-panel yield questions. |
| `stepMinutes` | no | — | If set (1 … 240), the response includes a `path` array sampled at this cadence across the local day. |

```bash
curl "http://localhost:3003/api/daylight?lat=48.8530&lng=2.3499&date=2026-12-21&tzOffset=1&minAltitude=6"
```

```json
{
  "query": {
    "lat": 48.853, "lng": 2.3499, "date": "2026-12-21",
    "tzOffsetHours": 1, "tzOffsetSource": "caller", "minAltitudeDeg": 6
  },
  "sunrise": "2026-12-21T08:42:30+01:00",
  "sunset": "2026-12-21T16:57:10+01:00",
  "solarNoon": "2026-12-21T12:49:50+01:00",
  "sunriseHours": 8.708,
  "sunsetHours": 16.953,
  "dayLengthHours": 8.03,
  "directSunHours": 6.4,
  "maxAltitudeDeg": 17.71,
  "solarNoonAzimuthDeg": 180.25,
  "polarDay": false,
  "polarNight": false
}
```

| Field | Meaning |
|-------|---------|
| `sunrise` / `sunset` | ISO-8601 with the chosen offset. `null` on polar day/night. |
| `solarNoon` | Moment the sun is highest. |
| `sunriseHours` / `sunsetHours` | Same times as decimal local hours (`8.708` = 08:42:30). Handy for plotting. |
| `dayLengthHours` | Hours the sun is above the horizon (altitude > 0). |
| `directSunHours` | Hours the sun is at or above `minAltitude`. Equals `dayLengthHours` when `minAltitude = 0`. |
| `maxAltitudeDeg` | Sun altitude at solar noon — how high it gets. Low value ⇒ long shadows, weak winter sun. |
| `solarNoonAzimuthDeg` | Compass bearing of the sun at solar noon (≈180 in the northern hemisphere). |
| `polarDay` / `polarNight` | `true` when the sun never sets / never rises that day. |
| `path` *(optional)* | `[{ time, altitudeDeg, azimuthDeg }, …]` — only when `stepMinutes` is given. |

### `path` example

```bash
curl "http://localhost:3003/api/daylight?lat=48.85&lng=2.35&date=2026-06-21&tzOffset=2&stepMinutes=60"
```

```json
{
  "...": "...",
  "path": [
    { "time": "2026-06-21T05:00:00+02:00", "altitudeDeg": -3.1, "azimuthDeg": 47.9 },
    { "time": "2026-06-21T06:00:00+02:00", "altitudeDeg": 6.8,  "azimuthDeg": 58.0 }
  ]
}
```

---

## Errors

`400 Bad Request` with a JSON body for any invalid parameter:

```json
{ "error": "bad_request", "message": "lat must be a number in [-90, 90]" }
```

---

## Client examples

### Python (standard library — no `requests` needed)

```python
import json, urllib.parse, urllib.request

def daylight(lat, lng, date, tz_offset=None, min_altitude=0, base="http://localhost:3003"):
    q = {"lat": lat, "lng": lng, "date": date, "minAltitude": min_altitude}
    if tz_offset is not None:
        q["tzOffset"] = tz_offset
    url = f"{base}/api/daylight?" + urllib.parse.urlencode(q)
    with urllib.request.urlopen(url, timeout=10) as r:
        return json.load(r)

info = daylight(48.8530, 2.3499, "2026-12-21", tz_offset=1, min_altitude=6)
print(f"{info['directSunHours']} h of direct sun, sun peaks at {info['maxAltitudeDeg']}°")
```

### JavaScript (browser or Node 18+)

```js
const params = new URLSearchParams({ lat: 48.853, lng: 2.3499, date: "2026-12-21", tzOffset: 1 });
const res = await fetch(`http://localhost:3003/api/daylight?${params}`);
if (!res.ok) throw new Error((await res.json()).message);
const info = await res.json();
```

---

## Accuracy notes

- Position math is SunCalc's — well under 0.1° for the altitude/azimuth of the
  sun, which is far more than enough for shadow and daylight questions.
- `directSunHours` and `dayLengthHours` are computed by sampling the whole local
  day **minute by minute**, so they are robust near the horizon and through
  polar day/night, and are accurate to about ±1 minute.
- Times use a **fixed UTC offset** you supply. There is no IANA time-zone
  lookup, so around DST transitions pass the offset that actually applies on
  that date.
- Atmospheric refraction near the horizon is included by SunCalc's model;
  `sunrise`/`sunset` use the standard −0.833° solar-disc/refraction angle.
