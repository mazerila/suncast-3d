# Suncast 3D

**Daylight &amp; shadow simulator.** A small web app that shows a real 3D city
model and casts **astronomically accurate sun shadows** for any location, date
(equinox / solstice), and local time of day. Built with
[CesiumJS](https://cesium.com/platform/cesiumjs/). Similar in spirit to
suntrace3d.com/viewer.

## What it does

- Loads 3D buildings for the whole planet (grey OSM extrusions, or Google
  photorealistic mesh).
- Puts the sun exactly where it would really be for the chosen **latitude /
  longitude**, **season**, **local time**, and **UTC offset**, and renders the
  resulting shadows in real time.
- Lets you **orbit the camera around a building** to inspect it from every side
  (heading slider, 45° step buttons, continuous spin, tilt, distance, arrow
  keys).
- Shows a live **sun altitude / azimuth** readout and tells you when it is
  night.

## Quick start

```bash
npm install
cp public/config.local.example.js public/config.local.js   # then add your keys
npm start                                                   # http://localhost:3003
```

Open <http://localhost:3003>. If you did not add keys to `config.local.js`, paste
them into the panel fields instead and click the matching **Load** button.

You need **at least one** of:

| Source | Looks like | Requires |
|--------|-----------|----------|
| **OSM 3D Buildings** (default) | Grey extruded buildings + satellite base map, worldwide | A **free** Cesium ion access token — <https://ion.cesium.com/tokens> |
| **Google Photorealistic 3D Tiles** | Real photo-textured mesh (roofs, trees, terrain) | A Google Cloud project with billing + the **Map Tiles API**, then an API key |

OSM mode needs no billing setup and is enough to "see the model in 3D".

## API keys &amp; the public repo

Keys live in **`public/config.local.js`**, which is listed in `.gitignore` and is
**never committed**. The file just sets a global:

```js
window.CONFIG = {
  cesiumIonToken: "eyJhbGciOi...",
  googleMapsKey:  "AIza...",
  autoLoad:       "osm"   // "osm", "google", or "" — what to load on page open
};
```

`public/index.html` merges `window.CONFIG` over its built-in blank defaults, so a
missing file is harmless — the app still runs and you type tokens into the panel.
Commit **`config.local.example.js`** (the template) but not `config.local.js`.

> **Note:** this is a static front-end, so any key it uses is visible to anyone
> who loads the deployed page. Keeping keys out of git avoids *publishing* them,
> but real protection is restricting each key in its provider console
> (HTTP-referrer allow-list + per-API limits). Treat the key that was previously
> hard-coded in `index.html` as exposed and rotate it.

## Publish to GitHub

```bash
git init
git add .
git status                     # confirm public/config.local.js is NOT listed
git commit -m "3D sun & shadow simulator"
git branch -M main
git remote add origin git@github.com:<you>/suncast-3d.git
git push -u origin main
```

## Docs

- [`docs/SETUP.md`](docs/SETUP.md) — getting the API keys, configuration
  options, deploying.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the viewer, sun math, and
  orbit camera work.

## Files

```
server.js                        Express static server (port 3003)
public/index.html                Entire frontend (Cesium viewer + controls)
public/config.local.example.js   Key template — copy to config.local.js
public/config.local.js           Your real keys (git-ignored)
docs/                            Setup + architecture notes
```

## License

[MIT](LICENSE) © Alireza

CesiumJS (Apache-2.0), SunCalc (BSD-2-Clause) and Express (MIT) keep their own
licenses. Cesium ion and the Google Map Tiles API are third-party services
governed by their own terms — bring your own keys.
