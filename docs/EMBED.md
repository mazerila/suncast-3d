# Embedding Suncast 3D — `/embed/v1`

A chrome-less version of the viewer for other sites to put in an `<iframe>`:
no side panel, no address search — just the 3D scene, the **time-of-day slider
with ▶ play**, the compass and zoom, and a small "Suncast 3D ↗" badge that opens
the same view in the full app.

```html
<iframe
  src="https://suncast.web.app/embed/v1?lat=48.854189&lng=2.05201&date=2026-12-21&time=14:30"
  width="100%" height="600" style="border:0" loading="lazy" allow="fullscreen"
  title="Sun and shadows at this address"></iframe>
```

## Contract (v1 — stable)

`GET https://suncast.web.app/embed/v1?…`

| Param | Required | Format | Default | Notes |
|-------|----------|--------|---------|-------|
| `lat` | yes | −90 … 90 | — | If missing/invalid: shows the Château de Versailles with a small "no location given" note. Never an error page. |
| `lng` | yes | −180 … 180 | — | idem |
| `date` | no | `YYYY-MM-DD` | today | Sun position for that calendar date. |
| `time` | no | `HH:MM` or decimal hours (`14.5`) | `12:00` | Local time at the location, snapped to 15-min steps. The slider stays live. |
| `tzOffset` | no | −12 … 14 (hours, may be `.5`) | **auto** | Normally leave it out: the UTC offset is derived from the location's real IANA zone **including DST for `date`** (Paris: +2 in June, +1 in December). Pass it only to force a specific offset. |
| `heading` | no | 0 … 360 | `0` (north-up) | Camera bearing. |
| `pitch` | no | −89 … −5 | `−40` | Camera tilt; −89 = top-down. |
| `range` | no | 30 … 15000 (m) | `400` | Camera distance from the target point. |
| `marker` | no | `0` to disable | on | When `lat`/`lng` are given, the house is marked (see below). |
| `lang` | no | `en` `fr` `es` `de` `it` | auto | Interface language. Without it: the viewer's browser language, else the language of the country at `lat`/`lng`, else English. (The panel is hidden in embeds, so `lang` is the only way to pick one there.) Added 2026-09-19 (additive, still v1). |
| `path` | no | `0` to disable | on | The day's sun path: a gold arc over the spot from sunrise to sunset with the sun at the chosen time on it, plus sunrise ↑ / sunset ↓ direction lines on the ground with their times. Added 2026-09-17; leaving it out keeps the arc (additive, still v1). |

- Unknown params are ignored; out-of-range values fall back to the default for
  that param only.
- `/embed` (no version) and `/?embed=1` are aliases of `/embed/v1`. Pin
  `/embed/v1` — its parameters and defaults will not change; a breaking change
  would ship as `/embed/v2`.
- The page sets no `X-Frame-Options` / `frame-ancestors`, so any origin may
  frame it. It never asks for geolocation in embed mode.
- The same deep-link params work on the full app too: `https://suncast.web.app/?lat=…&lng=…&date=…&time=…`
  opens the normal UI (panel open) already aimed at that address — that's where
  the badge in the embed points. A valid `lat`/`lng` in the URL takes precedence
  over geolocation.

## The house marker

With `lat`/`lng` supplied (on `/` and `/embed/v1` alike) the chosen house is
shown by **tinting the building itself light cyan** — nothing else is drawn:
no pin, no ring, no flash.

- The tinted building is the OSM Buildings feature whose own centroid
  (`cesium#latitude/longitude`) is nearest the point, within 50 m. Tint only, so
  the sun shading on its faces stays readable; it is re-applied as tiles stream
  in and out. If no centroid is within 40 m (a very large building, or open
  ground) nothing is tinted.
- Cyan on purpose — yellow/orange is the sun's own colour in this app.
- `marker=0` turns it off.
- Diagnostics: `window.suncast.marker` → `{ lat, lng, highlightedElementId,
  highlightedCentroidDistanceM }`.

In the full app the tint follows the house being examined: it moves to the
result of the address search, to "Go" (coordinates), and to "Locate"
(the previous building is un-tinted). Dragging the map does not move it.

## What the 3D view actually shows — read this before promising overshadowing

- **Buildings:** Cesium OSM Buildings — every footprint tagged `building=*` in
  OpenStreetMap, extruded. In France the footprints are excellent (the cadastre
  was imported into OSM), so neighbouring houses are present and **do cast
  shadows onto the plot**. Checked at `48.854189, 2.05201` (Noisy-le-Roi):
  116 buildings within 120 m.
- **Heights are approximate.** Almost no French suburban buildings carry
  `height` / `building:levels` tags (0 of those 116), so Cesium extrudes them at
  a default height. A 2-storey house and a 4-storey block may look the same.
  Shadow *direction* and *whether a neighbour sits between the plot and the
  sun* are right; shadow *length* from a specific neighbour can be off.
- **No trees, hedges, walls** — those don't exist in the model.
- **Terrain** is Cesium World Terrain (real elevations), so slope and hills are
  right.
- Google Photorealistic 3D Tiles are not available for EU/EEA Google accounts,
  so OSM is what French users get.

Honest framing for a listing: *"3D view of the sun and building shadows at this
address (building heights approximate; vegetation not modelled)."*

## Analytics inside the embed

The embed reports usage to the same PostHog project as the full app, with
`app_mode = embed` and `embed_host` = the embedding page's hostname (from the
referrer), so the site owner can see how much use comes from each integrator.
Visitors are anonymous; session replay is not recorded on embedding sites.
`lat`/`lng` from the embed URL do appear in the pageview's `$current_url` —
see [`ANALYTICS.md`](ANALYTICS.md) § Privacy notes.

## Cost / quota

The embed uses the site owner's **free Cesium ion token**, published in
`config.public.js`. Cesium's free tier is generous but not infinite; heavy
third-party embedding is worth a look at <https://ion.cesium.com> usage. The
token is restricted by allowed URL to `suncast.web.app`, which still works
inside an iframe (the frame's own origin is what Cesium checks). The paid
Google key is never published.

## The JSON API (`/api/daylight`) is not on the public site

`server.js` (Express) runs only locally; Firebase Hosting is static. The `/api`
routes reach production only once the Cloud Run step in
[`DEPLOY.md`](DEPLOY.md) §8 is done (needs the Blaze plan). Until then, a
caller needing only sunrise/sunset/altitude numbers can compute them locally
with any SunCalc port — the 3D shadow view is the part that can't be
reproduced, and that is what the embed provides.
