# Setup

## 1. Install and run

```bash
npm install
npm start          # serves ./public on http://localhost:3003
```

`server.js` is a ~10-line Express static server. Any static host works too
(`python3 -m http.server`, `npx serve public`, GitHub Pages, Netlify, …) — the
app is entirely client-side.

Change the port with `PORT=8080 npm start`.

## 2. Get API keys

### Cesium ion token (OSM buildings, terrain, base map, address search) — free

1. Create an account at <https://ion.cesium.com>.
2. Open <https://ion.cesium.com/tokens>.
3. Copy the **Default Token** (or make a new one). The default scopes are
   enough: `assets:read`, `geocode`.

### Google Maps API key (photorealistic 3D tiles) — needs billing

1. In <https://console.cloud.google.com> create / pick a project **with a
   billing account**.
2. Enable the **Map Tiles API**.
3. **APIs & Services → Credentials → Create credentials → API key.**
4. Restrict it:
   - **Application restrictions → Websites** — add
     `http://localhost:3003/*` and your deployed origin.
   - **API restrictions** — limit to *Map Tiles API*.

You only need one of the two. OSM mode requires no billing.

## 3. Configure

Copy the template and fill in whichever keys you have:

```bash
cp public/config.local.example.js public/config.local.js
```

```js
// public/config.local.js   (git-ignored — never committed)
window.CONFIG = {
  cesiumIonToken: "eyJhbGciOi...",
  googleMapsKey:  "AIza...",
  autoLoad:       "osm"
};
```

| Field | Meaning |
|-------|---------|
| `cesiumIonToken` | Enables OSM buildings, world terrain + imagery, and the top-right address search box. |
| `googleMapsKey` | Enables the **Load Google Photorealistic** button. |
| `autoLoad` | `"osm"`, `"google"`, or `""`. On page load, auto-loads that source **if its key is present**. |

No `config.local.js`? The app still loads; the panel fields start blank and you
paste tokens in by hand, then click **Load OSM 3D Buildings** /
**Load Google Photorealistic**.

## 4. Use it

1. Load a buildings source (button, or `autoLoad`).
2. Set the view:
   - Type **Lat / Lng** and **Fly to**, or **📍 My location**, or the
     address search box (top-right, needs the ion token).
3. Move the sun:
   - **Season / Date** — equinoxes and solstices for the current year.
   - **Local time of day** — 00:00–23:45 in 15-min steps.
   - **UTC offset** — auto-guessed from longitude as `round(lng / 15)`; fix it
     for the true time zone and DST.
   - **Enable shadows** — toggle the shadow map.
4. Orbit the building:
   - **View direction** slider / **⟲ 45°** / **45° ⟳** / **▶ Spin**.
   - **Camera tilt** and **Camera distance** sliders.
   - Arrow keys: **◀ ▶** rotate, **▲ ▼** tilt (when the map, not a field, has
     focus). Mouse drag still works; Ctrl-drag or middle-drag tilts.

The **Sun** readout shows altitude / azimuth, or "Night" when the sun is below
the horizon.

## 5. Deploy

Any static host serves `public/`. Two notes:

- Put a `config.local.js` on the host (or bake keys into a build step). It is
  git-ignored, so it will not arrive via `git push` — upload it separately or
  generate it in CI from secrets.
- Add the deployed origin to the **HTTP-referrer allow-list** of both keys.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Banner: *"using Cesium's default ion access token"* | No `cesiumIonToken`. Add one and reload, or paste into the panel. |
| **Load OSM** → *"Failed to load OSM buildings"* | Bad / expired ion token, or missing `assets:read` scope. |
| **Load Google** → *"Failed to load Google 3D Tiles"* | Map Tiles API not enabled, billing off, or referrer restriction blocks `localhost`. |
| Shadows never appear | Sun is below the horizon (check the readout), or **Enable shadows** is off, or camera is > ~8 km away (`shadowMap.maximumDistance`). |
| Shadows point the wrong way | Wrong **UTC offset** — adjust for the real time zone / DST. |
| Address search box missing | Needs the ion token (`geocoder: true` uses ion). |
