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
  keys), plus ＋/− zoom buttons.
- Shows a live **sun altitude / azimuth** readout and tells you when it is
  night.
- Exposes a keyless **JSON API** (`/api/sun`, `/api/daylight`) so other apps can
  pull sun position and daily daylight metrics for any coordinate — see
  [`docs/API.md`](docs/API.md).

On load it flies to your **current location** (browser geolocation); if that is
denied or unavailable it falls back to the **Château de Versailles**.

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
| **Google Photorealistic 3D Tiles** | Real photo-textured mesh (roofs, trees, terrain) | A Google Cloud project with billing + the **Map Tiles API**, then an API key |

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
- [`docs/API.md`](docs/API.md) — HTTP API reference.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the viewer, sun math, and
  orbit camera work.

## Files

```
server.js                        Express server: static viewer + /api JSON routes
lib/sun.js                       Server-side sun math (SunCalc) behind the API
public/index.html                Entire frontend (Cesium viewer + controls)
public/config.local.example.js   Key template — copy to config.local.js
public/config.local.js           Your real keys, machine-only (git-ignored, never deployed)
public/config.public.js          Generated: publishable keys only (git-ignored)
scripts/build-public-config.js   Generates config.public.js from config.local.js (predeploy hook)
firebase.json / .firebaserc      Firebase Hosting config (+ /api rewrite to Cloud Run)
Dockerfile / .dockerignore       Cloud Run image for the API
.github/workflows/               Auto-deploy Hosting to suncast.web.app on merge to main
docs/                            SETUP, DEPLOY, API, ARCHITECTURE
```

## License

[MIT](LICENSE) © Alireza

CesiumJS (Apache-2.0), SunCalc (BSD-2-Clause) and Express (MIT) keep their own
licenses. Cesium ion and the Google Map Tiles API are third-party services
governed by their own terms — bring your own keys.
