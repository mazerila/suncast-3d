# Architecture

## Overview

Two loosely-coupled parts:

1. **The viewer** — one static HTML file (`public/index.html`) with all its CSS
   and a single inline `<script>`. This is the whole 3D app.
2. **The API** — `server.js` (Express) serves that file *and* mounts a small
   keyless JSON API under `/api`, backed by `lib/sun.js`. The two parts share
   nothing but the process.

```
server.js                  Express: static public/ + /api routes + LAN banner
lib/sun.js                  sunPosition() / daylight() — SunCalc, no Cesium
public/index.html           viewer: markup + CSS + one inline <script>
public/config.local.js      window.CONFIG = { keys }   (git-ignored)
```

The **viewer** pulls its libraries from CDNs at runtime — nothing is bundled:

| Library | Version | Purpose |
|---------|---------|---------|
| CesiumJS | 1.115 (`cesium.com`) | globe, 3D tiles, camera, shadow map, geocoder |
| SunCalc | 1.9.0 (`cdnjs`) | altitude / azimuth **readout only** (not the shadows) |

The **API** depends on `express` and `suncalc` from npm (`package.json`); it
never loads Cesium.

## HTTP API (`server.js` + `lib/sun.js`)

Full reference: [`API.md`](API.md). Shape:

```
GET /api            → self-describing index
GET /api/sun        → { altitudeDeg, azimuthDeg, isNight }         params: lat, lng, [datetime]
GET /api/daylight   → { sunrise, sunset, solarNoon, dayLengthHours,
                        directSunHours, maxAltitudeDeg, … , [path] } params: lat, lng, [date],
                                                                     [tzOffset], [minAltitude], [stepMinutes]
```

- **Middleware order:** an `/api` CORS shim (`Access-Control-Allow-Origin: *`,
  `GET, OPTIONS`, 1 h cache) → the three `/api/*` handlers → `express.static`
  for everything else. Static never shadows `/api` because those routes are
  registered first.
- **Validation** lives in `server.js` (`readLatLng`, range checks on every
  query param) and returns `400 { error: "bad_request", message }`. Calendar
  sanity (`2026-02-30` etc.) is caught in `lib/sun.js` and surfaced as the same
  400.
- **`lib/sun.js` is pure:** `sunPosition(when, lat, lng)` wraps
  `SunCalc.getPosition` and converts azimuth to compass bearing (0 = N).
  `daylight(dateStr, lat, lng, opts)` calls `SunCalc.getTimes` for the
  rise/set/noon instants, then **samples the local day minute-by-minute**
  (1440 iterations) to count `dayLengthHours` / `directSunHours` robustly
  through grazing incidence and polar day/night. `path` is an optional coarser
  sample (`stepMinutes`).
- **Time zones:** no IANA database. `tzOffset` is taken from the caller, else
  estimated as `round(lng / 15)`; all output timestamps are ISO-8601 with that
  fixed offset. `tzOffsetSource` in the response says which was used.
- **No keys, no state, deterministic** — safe to cache and to call from any
  origin.

## Server networking

`app.listen(PORT, HOST)` with `HOST` defaulting to `0.0.0.0` (all interfaces).
On boot the server enumerates `os.networkInterfaces()` and prints every
non-internal IPv4 URL so LAN clients know where to point. `HOST=127.0.0.1`
restricts to loopback. See [`SETUP.md`](SETUP.md) §5 for the firewall and
HTTPS/geolocation caveats.

## Page structure

```
<body>
  #cesiumContainer      full-viewport Cesium canvas
  #panel-toggle         floating "☰ Controls" button (shown when the panel is hidden)
  #ui-panel             control panel (top-left): sticky header + .panel-body
    ├─ Location         lat/lng + "Go to coordinates" + 📍
    ├─ Date & time      <input type=date> + preset chips, big time slider, UTC offset, shadows
    ├─ #sun-readout     altitude / bearing, or "Night"
    ├─ <details> Camera & orbit     heading / tilt / distance / spin  (folded)
    └─ <details> #setup Map data & keys   ion token, Google key, how-to guides (folded;
                                          opens itself when no token is present)
  <script>              config merge → viewer → functions → event wiring
</body>
```

The panel collapses (`#ui-panel.collapsed` slides it off-canvas) via the header
`✕` / floating `☰`; it starts collapsed under 640 px and re-applies that default
when the viewport crosses the breakpoint.

### Config merge

`config.local.js` (loaded in `<head>`, `onerror` tolerated) sets `window.CONFIG`.
The inline script merges it over blank defaults:

```js
const CONFIG = Object.assign(
  { cesiumIonToken: "", googleMapsKey: "" },
  window.CONFIG || {}
);
```

So the file is optional and no key is ever hard-coded in `index.html`. The
Cesium token, if present, is assigned to `Cesium.Ion.defaultAccessToken`
**before** the `Viewer` is constructed, so Cesium never prints its
"default access token" warning. On startup the app loads **OSM 3D buildings**
automatically when a Cesium token is available; **Google Photorealistic** never
auto-loads (it needs a paid key) — the user opens it from the "Map data"
section on demand.

### Viewer

```js
const viewer = new Cesium.Viewer('cesiumContainer', {
  baseLayer: false,      // start with no imagery → works before a token exists
  timeline: false, animation: false,
  geocoder: true,        // ion-backed address search, active once a token is set
  /* homeButton, sceneModePicker, baseLayerPicker, navigationHelpButton,
     infoBox, selectionIndicator all disabled */
});
viewer.scene.globe.enableLighting = true;
viewer.clock.shouldAnimate = false;   // clock holds whatever time we set
viewer.shadows = true;
viewer.shadowMap.softShadows = true;
viewer.shadowMap.darkness = 0.35;
viewer.shadowMap.maximumDistance = 8000;   // metres; shadows fade past this
```

## Buildings data sources

Two mutually-exclusive loaders; each removes the other's primitive first.

### `loadOsmBuildings()`

1. `Cesium.Ion.defaultAccessToken = <token>`.
2. Add world imagery (`ImageryLayer.fromWorldImagery`) + world terrain
   (`CesiumTerrainProvider.fromIonAssetId(1)`); show the globe.
3. `osmBuildings = await Cesium.createOsmBuildingsAsync()`,
   `shadows = ShadowMode.ENABLED`, add to `scene.primitives`.
4. `flyToLocation(lat, lng)`.

### `loadGoogleTiles()`

1. `Cesium.GoogleMaps.defaultApiKey = <key>`.
2. `googleTileset = await Cesium.createGooglePhotorealistic3DTileset()`,
   `shadows = ShadowMode.ENABLED`, add to `scene.primitives`.
3. `viewer.scene.globe.show = false` — the mesh already contains the ground.
4. `flyToLocation(lat, lng)`.

## Sun / shadow math

The shadow map is driven **entirely by the scene clock's UTC time**. Cesium
computes the true solar direction for that instant internally.

```
#date (YYYY-MM-DD) + #time slider + #tz  ──►  UTC instant  ──►  viewer.clock.currentTime
```

`updateSunPosition()`:

```js
const { year, month, day } = dateParts();               // parsed from the #date input
const utcMs = Date.UTC(year, month, day, hh, mm, 0)      // treat date+time as local wall-clock…
            - tzOffset * 3600 * 1000;                    // …then shift by the offset to get UTC
viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(utcMs));
```

- **Date** is a native `<input type="date">` (defaults to today); four preset
  chips set it to that year's equinoxes / solstices. `dateParts()` regex-parses
  the value, falling back to today's date if it is blank.
- **UTC offset** is auto-seeded on every fly as `round(lng / 15)` (clamped
  −12…14); the user corrects it for the real zone / DST.
- **SunCalc** is called separately with the same `Date` and the lat/lng purely
  to print `altitude° / azimuth°` (azimuth normalised so 0° = N, 90° = E) and to
  detect night (`altitude <= 0`). It does **not** affect rendering.

## Camera

### Fly

`flyToLocation(lat, lng)` re-estimates the UTC offset, then
`viewer.camera.flyTo({ destination: fromDegrees(lng, lat, 400), orientation:
{ heading: 0, pitch: -35°, roll: 0 }, duration: 2, complete: () =>
seedOrbitFromCamera(lat, lng) })`.

### Orbit ("see all sides")

State: `const orbit = { heading, pitch, range }` (degrees, degrees, metres).

```js
function applyOrbit() {
  const center = orbitCenter();               // fromDegrees(lng, lat, terrainHeight + 3)
  viewer.camera.lookAt(
    center,
    new Cesium.HeadingPitchRange(
      toRadians(orbit.heading), toRadians(orbit.pitch), orbit.range
    )
  );
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);  // release frame → mouse nav still works
}
```

- `orbitCenter()` anchors on the **Lat/Lng fields**, lifted by
  `scene.globe.getHeight()` (falls back to 0 when terrain/globe is absent, e.g.
  Google mesh mode).
- `lookAt` + immediate `lookAtTransform(IDENTITY)` is the standard Cesium idiom:
  it positions the camera relative to the target, then hands control back so
  drag / zoom / tilt keep working.
- `seedOrbitFromCamera()` runs after each `flyTo` completes: it reads
  `camera.positionWC`, `camera.heading`, `camera.pitch`, derives `range` from
  the distance to `center`, and writes the sliders so they start truthful.
- **Spin** is a `requestAnimationFrame` loop that adds `0.25°` to
  `orbit.heading` each frame while `spinning` is true.
- Arrow keys (`keydown` on `window`, ignored while an `INPUT/SELECT/TEXTAREA`
  is focused): ◀ ▶ = ±5° heading, ▲ ▼ = ±3° pitch (clamped −89…−5).

## Event wiring

| Element | Handler |
|---------|---------|
| `#btn-load-osm` / `#btn-load-google` | `loadOsmBuildings` / `loadGoogleTiles` |
| `#btn-fly` | `flyToLocation(lat, lng)` |
| `#btn-geo` | `navigator.geolocation` → fill fields → `flyToLocation` |
| `#time` / `#date` / `#tz` | `updateSunPosition` |
| `.chip[data-date]` | set `#date` to today / an equinox / a solstice → `updateSunPosition` |
| `#toggle-shadows` | `viewer.shadows = checked` |
| `#heading` / `#pitch` / `#range` | update `orbit.*` → `applyOrbit` |
| `#btn-rot-left` / `#btn-rot-right` | `nudgeHeading(∓45)` |
| `#btn-spin` | toggle `spinning`, relabel button |
| `window` keydown | arrow-key rotate / tilt |

## Extension ideas

- Click a building → "hours of direct sun today" on its roof
  (`viewer.clock` sweep + sampled shadow tests).
- Play button: animate the day with `viewer.clock.shouldAnimate = true` and a
  multiplier, record a shadow time-lapse.
- Real IANA time zone from a lat/lng → tz lookup instead of `round(lng / 15)`.
- Compass rose / sun-path arc overlay tied to `orbit.heading` and the SunCalc
  azimuth.
- Persist the last location + settings in `localStorage`.
