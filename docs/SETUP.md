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

You need **one** of these. Every person who runs their own copy of the app needs
their **own** key — the app is a web page, so the key lives in that person's
browser (`config.local.js` or the panel field) and is never sent to a server you
control. You do **not** need to be a programmer for either walkthrough.

### Cesium ion token — free, no credit card (~2 minutes)

Powers the grey OSM 3D buildings, world terrain, satellite base map, and the
address search box.

1. Go to <https://ion.cesium.com/signup> and make a free account — email +
   password, or **Sign up with Google / GitHub**. No payment details are
   requested.
2. Once signed in, click **Access Tokens** in the top navigation bar
   (or go straight to <https://ion.cesium.com/tokens>).
3. There is already a row called **Default Token**. Click it, then click the
   **Copy** button beside the long `eyJ...` string.
   - Prefer a dedicated token? Click **Create token**, type any name, leave the
     ticked scopes **`assets:read`** and **`geocode`** as they are, click
     **Create**, then copy it.
4. Put the token in `config.local.js` as `cesiumIonToken`, **or** open
   **Map data** in the panel, paste it into the **Cesium ion token** box, and
   click **Use OSM 3D buildings**.

The free tier is fine for personal use.

### Google Maps API key — credit card required (~10 minutes)

Powers the photo-textured Google Photorealistic 3D mesh. Skip this if OSM mode is
enough for you.

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and sign in
   with a Google account.
2. **Create a project:** top bar → the project dropdown → **New Project** → give
   it a name → **Create**. Select it once it is ready.
3. **Add billing:** menu (☰) → **Billing** → **Link a billing account** → add a
   card. Google includes a recurring free monthly allowance, but a valid card is
   still mandatory.
4. **Enable the API:** menu → **APIs & Services → Library**, search
   **Map Tiles API**, open it, click **Enable**.
5. **Create the key:** menu → **APIs & Services → Credentials** →
   **Create credentials** → **API key**. Copy the key shown in the dialog.
6. **Restrict the key** (click **Edit API key**):
   - **Application restrictions → Websites** — add `http://localhost:3003/*` and
     your deployed site's address.
   - **API restrictions → Restrict key** — tick **Map Tiles API** only.
   - **Save.**
7. Put the key in `config.local.js` as `googleMapsKey`, **or** paste it into the
   **Google Maps API key** box in the app and click **Load Google Photorealistic**.

> The key is visible to anyone who opens your deployed page (that is unavoidable
> for a browser app). The website + API restrictions in step 6 are what stop it
> being reused elsewhere — do not skip them. Treat any key that has been committed
> to git or shared in plain text as compromised and regenerate it.

### In-app help

The app's control panel has the same two walkthroughs behind the
**"How to get a … token"** toggles, so end users can follow them without
leaving the page.

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
};
```

| Field | Meaning |
|-------|---------|
| `cesiumIonToken` | Enables OSM buildings, world terrain + imagery, and the top-right address search box. When set, **OSM 3D buildings load automatically** on page open. |
| `googleMapsKey` | Optional. Used **only** when you open **Map data** in the panel and click **Load Google Photorealistic** (it needs a paid key, so it never auto-loads). |

No `config.local.js`? The app still loads. Open **Map data** in the panel, paste
a token, and click **Use OSM 3D buildings**.

## 4. Use it

On load the app flies to your current location (or the Château de Versailles if
geolocation is denied) and, if a Cesium token is available, loads OSM 3D
buildings automatically.

1. **Location** — type **Lat / Lng** and **Go to coordinates**, hit **📍**, or
   use the address search box at the top-right of the map.
2. **Date & time:**
   - **Date** — pick any date, or tap a preset chip (**Today**, **Mar equinox**,
     **Jun solstice**, **Sep equinox**, **Dec solstice**).
   - **Time of day** — 00:00–23:45 in 15-min steps.
   - **UTC offset** — auto-set from the map location (`round(lng / 15)`) every
     time you move; nudge it for the true zone / DST and your value then sticks.

Shadows are always on; at night the sun readout says so and nothing casts one.
3. **Camera & orbit** (folded section):
   - **Orbit around location** slider / **⟲ 45°** / **45° ⟳** / **▶ Spin**.
   - **Camera tilt** and **Camera distance** sliders.
   - Arrow keys: **◀ ▶** rotate, **▲ ▼** tilt (when the map, not a field, has
     focus). Mouse drag still works; Ctrl-drag or middle-drag tilts.

The **Sun** readout shows altitude / azimuth, or "Night" when the sun is below
the horizon.

## 5. Access from other devices on your network (LAN)

`npm start` already listens on **every network interface**, so other devices on
the same Wi-Fi / LAN / Tailscale can reach it. On startup the server prints the
URLs to use:

```
Suncast 3D running (viewer + JSON API under /api)
  this machine : http://localhost:3003
  on your LAN  : http://192.168.1.40:3003
  on your LAN  : http://100.117.148.71:3003
```

Open the `on your LAN` URL from a phone or another computer on the same network.

- **Find the IP yourself:** `ipconfig getifaddr en0` (Wi-Fi) or `ipconfig getifaddr en1`.
- **macOS firewall:** if it is on, the first run pops *"Do you want the
  application 'node' to accept incoming network connections?"* — click **Allow**.
  If you missed it: System Settings → Network → Firewall → Options → add / allow
  `node` (or your Node binary), or turn the firewall off on a trusted network.
- **Restrict to this machine only:** `HOST=127.0.0.1 npm start`.
- **Change the port:** `PORT=8080 npm start`.

**Before exposing it on a shared network, know that:**

- The page serves your `public/config.local.js` — i.e. **your API keys** — to
  anyone who opens it. Keep the keys HTTP-referrer-restricted, and don't do this
  on public / untrusted Wi-Fi.
- Add the LAN origin (e.g. `http://192.168.1.40:3003/*`) to each key's referrer
  allow-list or the map tiles will 403.
- **Browser geolocation only works on `localhost` or HTTPS**, not on a plain
  `http://192.168.x.x` address. On LAN devices the "start at my location" step
  silently fails and the app opens at the **Château de Versailles** fallback —
  use the address search box or type coordinates instead.
- The `/api` routes are open (no key, `Access-Control-Allow-Origin: *`). They
  only do public astronomy math, but anyone on the LAN can call them.

## 6. Deploy

Any static host serves `public/` (the viewer). To also expose the `/api`
endpoints you need a Node host running `server.js`.

- Put a `config.local.js` on the host (or bake keys into a build step). It is
  git-ignored, so it will not arrive via `git push` — upload it separately or
  generate it in CI from secrets.
- Add the deployed origin to the **HTTP-referrer allow-list** of both keys.
- Behind a reverse proxy (nginx, Caddy, …) terminate HTTPS there and forward to
  `server.js`; that also restores geolocation for every visitor.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Bottom bar: *"using Cesium's default ion access token"* | No `cesiumIonToken`. Add one to `config.local.js` and reload, or paste it in **Map data**. The **Cesium ion · Data attribution** credit stays either way — it is required and cannot be removed. |
| *"Could not load OSM 3D buildings"* | Bad / expired ion token, or missing `assets:read` scope. |
| *"Could not load Google Photorealistic 3D Tiles"* | Map Tiles API not enabled, billing off, or referrer restriction blocks `localhost`. |
| Shadows never appear | Sun is below the horizon (check the readout), or the camera is > ~8 km away (`shadowMap.maximumDistance`). |
| Shadows point the wrong way | Wrong **UTC offset** — adjust for the real time zone / DST. |
| Address search box missing | Needs the ion token (`geocoder: true` uses ion). |
