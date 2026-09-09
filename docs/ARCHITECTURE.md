# Architecture

## Overview

The whole app is **one static HTML file**. `server.js` is only a convenience
static server.

```
server.js                  Express, serves ./public on :3003 (10 lines)
public/index.html           markup + all CSS + one inline <script>
public/config.local.js      window.CONFIG = { keys }   (git-ignored)
```

External code is pulled from CDNs at runtime — nothing is bundled:

| Library | Version | Purpose |
|---------|---------|---------|
| CesiumJS | 1.115 (`cesium.com`) | globe, 3D tiles, camera, shadow map, geocoder |
| SunCalc | 1.9.0 (`cdnjs`) | altitude / azimuth **readout only** (not the shadows) |

## Page structure

```
<body>
  #cesiumContainer      full-viewport Cesium canvas
  #ui-panel             absolutely-positioned control panel (top-left)
  <script>              config merge → viewer → functions → event wiring
</body>
```

### Config merge

`config.local.js` (loaded in `<head>`, `onerror` tolerated) sets `window.CONFIG`.
The inline script merges it over blank defaults:

```js
const CONFIG = Object.assign(
  { cesiumIonToken: "", googleMapsKey: "", autoLoad: "osm" },
  window.CONFIG || {}
);
```

So the file is optional and no key is ever hard-coded in `index.html`.

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
sliders (local wall-clock)  ──►  UTC instant  ──►  viewer.clock.currentTime
season  ──► month/day
```

`updateSunPosition()`:

```js
const [month, day] = seasonToMonthDay(season);          // equinox/solstice, current year
const utcMs = Date.UTC(year, month, day, hh, mm, 0)      // treat sliders as UTC…
            - tzOffset * 3600 * 1000;                    // …then shift by the offset
viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(utcMs));
```

- **UTC offset** is auto-seeded on every fly as `round(lng / 15)` (clamped
  −12…14); the user corrects it for the real zone / DST.
- **SunCalc** is called separately with the same `Date` and the lat/lng purely
  to print `altitude° / azimuth°` (azimuth normalised so 0° = N, 90° = E) and to
  detect night (`altitude <= 0`). It does **not** affect rendering.

Seasons map to fixed dates: spring `Mar 20`, summer `Jun 21`, autumn `Sep 22`,
winter `Dec 21` (month is 0-indexed in the code).

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
| `#time` / `#season` / `#tz` | `updateSunPosition` |
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
