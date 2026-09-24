# Suncast 3D

**Daylight &amp; shadow simulator.** A small web app that shows a real 3D city
model and casts **astronomically accurate sun shadows** for any location, date,
and time of day. Built with
[CesiumJS](https://cesium.com/platform/cesiumjs/). Similar in spirit to
suntrace3d.com/viewer.

## What it does

- Loads 3D buildings for the whole planet (grey OSM extrusions, or Google
  photorealistic mesh).
- Puts the sun exactly where it would really be for the chosen **latitude /
  longitude**, **date**, **time of day**, and **UTC offset**, and renders the
  resulting shadows in real time. The time slider is fixed along the bottom of
  the screen so it works with the panel closed (handy on a phone).
- Lets you **orbit the camera around a building** to inspect it from every side
  (heading slider, 45° step buttons, continuous spin, tilt, distance, arrow
  keys), plus ＋/− zoom buttons and a compass that always shows north.
- Finds places by **address search**, coordinates, your **location**, or a
  **click on the map**; tints the chosen house and shows its street address; **▶ plays the day**; and copies
  a **link** that reopens the exact place, date, time and camera.
- Shows a live **sun altitude / azimuth** readout and tells you when it is
  night; computes the **hours of direct sun** at the spot (shadows from the
  3D buildings included) and draws the day's **sun path** over the house with
  sunrise / sunset directions.
- Exposes a keyless **JSON API** (`/api/sun`, `/api/daylight`) so other apps can
  pull sun position and daily daylight metrics for any coordinate — see
  [`docs/API.md`](docs/API.md).
- **Embeddable**: `https://suncast.web.app/embed/v1?lat=…&lng=…&date=…&time=…`
  gives a chrome-less view (time slider kept) for an `<iframe>` — see
  [`docs/EMBED.md`](docs/EMBED.md).
- **Five languages** — English, French, Spanish, German, Italian — picked from
  the browser or the country on the map, switchable in the panel (`?lang=fr`
  forces one).

On load it flies to your **current location** (browser geolocation); if that is
denied or unavailable it falls back to the **Château de Versailles**.

## Analytics

Product analytics run on PostHog (EU cloud) via `public/analytics.js`, which is
loaded first in `index.html` and exposes `track(event, props)` — a no-op on
localhost / LAN, so local testing sends nothing (`?analytics=1` forces it on;
those events are flagged `is_test`). Tracking is **cookieless**: no cookie, no
localStorage, no consent banner; unique visitors are a per-day server-side
hash, so there is no cross-day retention, no session replay and no GeoIP
(`$timezone` stands in for country). Every event carries `product = suncast`
and `app_mode` (`full` | `embed`, plus the embedding hostname). Coordinates
are scrubbed from every URL before sending, the address box and address line
are masked, and the custom events never contain coordinates, addresses or
keys. The public write-only project token lives in the repo on purpose.

Custom events: `app_started`, `location_changed`, `buildings_loaded`,
`buildings_load_failed`, `sun_hours_computed`, `day_played`, `time_changed`,
`date_changed`, `timezone_changed`, `link_copied`, `camera_action`,
`language_changed`, `panel_toggled`, `geolocation_failed`, `embed_open_full_app`.
Their properties, the dashboard link, how to add an event, what cookieless
mode changes in the numbers and the privacy notes are in
[`docs/ANALYTICS.md`](docs/ANALYTICS.md).

## Quick start

```bash
npm install
cp public/config.local.example.js public/config.local.js   # then add your keys
npm start                                                   # http://localhost:3003
```

Open <http://localhost:3003>. With a Cesium token in `config.local.js`, OSM 3D
buildings load automatically. Otherwise, open **Map data** at the bottom of the
panel, paste a token, and click **Use OSM 3D buildings**.

You need **at least one** of:

| Source | Looks like | Requires |
|--------|-----------|----------|
| **OSM 3D Buildings** (default) | Grey extruded buildings + satellite base map, worldwide | A **free** Cesium ion access token — <https://ion.cesium.com/tokens> |
| **Google Photorealistic 3D Tiles** | Real photo-textured mesh (roofs, trees, terrain) | A Google Cloud project with billing + the **Map Tiles API**, then an API key. **Not served to EU/EEA billing accounts** (Google policy) — see `docs/SETUP.md` |

OSM mode needs no billing setup and is enough to "see the model in 3D".

## API keys — what is published and what is not

Two git-ignored files, both optional, both merged into `window.CONFIG`:

| File | Lives | Holds | Deployed? |
|------|-------|-------|-----------|
| `public/config.local.js` | your machine | `cesiumIonToken` **and** `googleMapsKey` | **No** — `firebase.json` ignores it |
| `public/config.public.js` | generated | `cesiumIonToken` only | **Yes** — this is what `suncast.web.app` loads |

`scripts/build-public-config.js` (run automatically by `firebase deploy` and by
CI) copies an explicit allow-list — currently just `cesiumIonToken` — from
`config.local.js` into `config.public.js`. **The Google Maps key can never reach
the public site**; visitors who want Google Photorealistic paste their own key
into the panel's *Map data* section (it stays in their browser).

```js
// public/config.local.js
window.CONFIG = Object.assign(window.CONFIG || {}, {
  cesiumIonToken: "eyJhbGciOi...",  // free tier — published; OSM 3D buildings load automatically
  googleMapsKey:  "AIza...",        // paid — local use only, never deployed
});
```

A missing file is harmless: the app still runs and you type keys into the panel.
Commit `config.local.example.js` (the template); never `config.local.js` or
`config.public.js`.

> The published Cesium token is still visible to anyone who loads the page, so
> restrict it to `https://suncast.web.app` in your ion token settings.

## Docs

- [`docs/SETUP.md`](docs/SETUP.md) — API keys, configuration, LAN access,
  troubleshooting.
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — step-by-step deploy to Firebase Hosting
  (`*.web.app`) + Cloud Run for the API, from a fresh Google account, plus
  GitHub Actions CI/CD (auto-deploy on merge to `main`).
- [`docs/EMBED.md`](docs/EMBED.md) — iframe embed URL contract (`/embed/v1`) and what the 3D view can and can't show.
- [`docs/API.md`](docs/API.md) — HTTP API reference.
- [`docs/ANALYTICS.md`](docs/ANALYTICS.md) — PostHog events, properties, dashboard, privacy notes.
- [`docs/SEO.md`](docs/SEO.md) — how the site is made findable and citable (incl. by AI answer engines).
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the viewer, sun math, and
  orbit camera work.

## Files

```
server.js                        Express server: static viewer + /api JSON routes
lib/sun.js                       Server-side sun math (SunCalc) behind the API
public/index.html                Entire frontend (Cesium viewer + controls)
public/i18n.js                   UI strings — English, French, Spanish, German, Italian
public/analytics.js              PostHog loader; defines track() (silent on localhost)
public/guide/                    Written guide (en, fr) — the crawlable/citable content
public/robots.txt                Crawl rules; AI crawlers explicitly allowed
public/sitemap.xml               / and the guide pages, with hreflang alternates
public/llms.txt                  Plain-language summary for AI assistants
public/img/og-card.png           1200x630 social card (source: scripts/og-card.html)
public/img/dev-logo-am.png       Developer monogram (panel footer credit)
public/config.local.example.js   Key template — copy to config.local.js
public/config.local.js           Your real keys, machine-only (git-ignored, never deployed)
public/config.public.js          Generated: publishable keys only (git-ignored)
scripts/build-public-config.js   Generates config.public.js from config.local.js (predeploy hook)
firebase.json / .firebaserc      Firebase Hosting config (the /api rewrite is added once Cloud Run exists — DEPLOY.md §8)
Dockerfile / .dockerignore       Cloud Run image for the API
.github/workflows/               Auto-deploy Hosting to suncast.web.app on merge to main
docs/                            SETUP, DEPLOY, EMBED, API, ANALYTICS, SEO, ARCHITECTURE
```

## License

[MIT](LICENSE) © Alireza

CesiumJS (Apache-2.0), SunCalc (BSD-2-Clause) and Express (MIT) keep their own
licenses. Cesium ion and the Google Map Tiles API are third-party services
governed by their own terms — bring your own keys.
