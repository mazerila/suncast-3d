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

> **Not available in the EU/EEA.** Google does not serve Photorealistic 3D
> Tiles (or satellite tiles) to Google Cloud **billing accounts based in an
> EU/EEA country** — France included. A correctly set-up key then gets
> `403 — "satellite tiles and 3D tiles are not available for your account and
> region"` ([Google's notice](https://developers.google.com/maps/comms/eea/map-tiles)).
> It is decided by the billing account's country, not by where the map is.
> OSM 3D buildings work everywhere and give the same shadows; the Google layer
> is only prettier textures.

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
// public/config.local.js   (git-ignored, machine-only — never committed, never deployed)
window.CONFIG = Object.assign(window.CONFIG || {}, {
  cesiumIonToken: "eyJhbGciOi...",
  googleMapsKey:  "AIza...",
});
```

| Field | Meaning | Published to the live site? |
|-------|---------|-----------------------------|
| `cesiumIonToken` | Enables OSM buildings, world terrain + imagery, and the top-right address search box. When set, **OSM 3D buildings load automatically** on page open. | **Yes** (free tier). At deploy time it is copied into the generated `public/config.public.js`. |
| `googleMapsKey` | Optional. Used **only** when you open **Map data** in the panel and click **Load Google Photorealistic** (it needs a paid key, so it never auto-loads). | **No — never.** It stays on your machine. Visitors to the live site paste their own key into the panel. |

The page loads `config.public.js` (published keys) and then `config.local.js`
(your machine); each merges into `window.CONFIG`. `firebase.json` excludes
`config.local.js` from uploads and regenerates `config.public.js` via
`scripts/build-public-config.js` before every deploy. See
[`DEPLOY.md`](DEPLOY.md) §5.

No `config.local.js`? The app still loads. Open **Map data** in the panel, paste
a token, and click **Use OSM 3D buildings**.

## 4. Use it

On load the app flies to your current location (or the Château de Versailles if
geolocation is denied) and, if a Cesium token is available, loads OSM 3D
buildings automatically.

1. **Location** — search an **address** (the field at the top of the panel;
   suggestions appear as you type), type **Lat / Lng** and **Go to
   coordinates**, hit **📍 My location** (needs HTTPS or localhost — see §5),
   or simply **click anywhere on the map** to pick a spot without moving the
   camera. Whichever you use, the chosen building is tinted cyan.
   **🔗 Copy link** copies a URL that reopens this exact place, date, time and
   camera (see [`EMBED.md`](EMBED.md) for the parameters).
2. **Time of day** — the slider fixed along the **bottom of the screen**, always
   visible over the map, with **▶** to play the whole day (1 h per second) and
   the selected date shown next to the time. 00:00–23:45 in 15-min steps. On a
   phone the **☰** at its left opens/closes the panel.
3. **Date & zone** (in the panel):
   - **Date** — pick any date, or tap a preset chip (**Today**, **Mar equinox**,
     **Jun solstice**, **Sep equinox**, **Dec solstice**).
   - **UTC offset** — set automatically from the map location's real time
     zone (e.g. `Europe/Paris`), **including daylight saving for the chosen
     date** — pick the Dec solstice in Paris and it flips from +2 to +1. The
     zone is shown under the slider. Drag the slider to override; your value
     then sticks until you go to a new place.

Shadows are always on; at night the sun readout says so and nothing casts one.
4. **Move / zoom the map:**
   - **Zoom** — the **＋ / −** buttons (bottom-right), the mouse wheel, or a
     two-finger pinch on touch.
   - **Rotate / pan** — drag with the mouse or one finger. Tilt with Ctrl-drag,
     the middle mouse button, or a two-finger drag.
5. **Camera & orbit** (folded panel section):
   - **Orbit around location** slider / **⟲ 45°** / **45° ⟳** / **▶ Spin**.
   - **Camera tilt** and **Camera distance** sliders.
   - **↺ Reset camera** — back to north-up, tilt −40°, 400 m.
   - Going somewhere new (address search, Go to coordinates, My location)
     keeps whatever tilt, distance and heading you have set; only the target
     moves.
   - Arrow keys: **◀ ▶** rotate, **▲ ▼** tilt (when the map, not a field, has
     focus).

The **Sun** readout shows the sun's altitude, its bearing (degrees + compass
point, e.g. `144° SE`), how long a shadow a 10 m house casts right now, and
that day's **sunrise ↑ / sunset ↓** at the place — or "Night" when the sun is
below the horizon. The time slider's track is coloured night / twilight / day
for that date and place. Press **Enter** in a coordinate
field to go there; invalid coordinates are flagged under the buttons. A short
message at the top of the map says when 3D buildings are loading or failed.

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

- The local dev server (`server.js`) serves your `public/config.local.js` —
  i.e. **all your keys, including the paid Google one** — to anyone on the
  network who opens it. (This is only true for the LAN dev server; the deployed
  site never gets that file.) Keep the keys HTTP-referrer-restricted, and don't
  do this on public / untrusted Wi-Fi.
- Add the LAN origin (e.g. `http://192.168.1.40:3003/*`) to each key's referrer
  allow-list or the map tiles will 403.
- **Browser geolocation ("📍 My location") only works on `localhost` or HTTPS**,
  never on a plain `http://192.168.x.x` (or Tailscale IP) address — the browser
  blocks it. So **on a phone over LAN, 📍 will not work**; the panel now shows
  "Location needs a secure page…" and the app opens at the **Château de
  Versailles** fallback. Use the address-search box or type coordinates.
  To get 📍 working on a phone, serve the app over HTTPS. Quickest options:
  - **Tailscale** (already installed here): `tailscale serve --bg 3003` gives a
    `https://<machine>.<tailnet>.ts.net` URL with a real cert — open that on the
    phone (it must be on your tailnet). `tailscale serve --https=443 off` to stop.
  - A reverse proxy (Caddy/nginx) terminating TLS in front of `server.js`.
  - `mkcert` for a locally-trusted cert (you also have to install its CA on the
    phone).
- The `/api` routes are open (no key, `Access-Control-Allow-Origin: *`). They
  only do public astronomy math, but anyone on the LAN can call them.

## 6. Deploy

Any static host serves `public/` (the viewer). To also expose the `/api`
endpoints you need a Node host running `server.js`.

- Publish a `config.public.js` containing only the Cesium token — run
  `node scripts/build-public-config.js` (Firebase does this for you as a
  predeploy hook) or generate it in CI from a secret. Never ship
  `config.local.js`.
- Add the deployed origin to the Cesium token's **allowed-URL** list.
- Behind a reverse proxy (nginx, Caddy, …) terminate HTTPS there and forward to
  `server.js`; that also restores geolocation for every visitor.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Bottom bar: *"using Cesium's default ion access token"* | No `cesiumIonToken`. Add one to `config.local.js` and reload, or paste it in **Map data**. The **Cesium ion · Data attribution** credit stays either way — it is required and cannot be removed. |
| *"Could not load OSM 3D buildings"* | Bad / expired ion token, or missing `assets:read` scope. |
| *"Could not load Google Photorealistic 3D Tiles: HTTP 403 — Requests to this API tile method … are blocked"* (`API_KEY_SERVICE_BLOCKED`) | The key's **API restrictions** don't include the **Map Tiles API** (people often tick "Maps JavaScript API" instead), or that API isn't enabled on the project. Credentials → the key → API restrictions → tick **Map Tiles API** (or *Don't restrict key* to test); APIs & Services → Library → Map Tiles API → Enable. Wait 1–5 min. |
| *"… HTTP 403 — … 3D tiles are not available for your account and region"* | Google's EU/EEA restriction (see the note in §2). Nothing to fix on the key; it needs a billing account outside the EEA. The app keeps OSM buildings loaded. |
| *"… HTTP 403 — Requests from referer … are blocked"* | **Application restrictions → Websites** on the key doesn't list the site you're on — add `https://suncast.web.app/*` and/or `http://localhost:3003/*`. |
| Test a Google key outside the app | `curl "https://tile.googleapis.com/v1/3dtiles/root.json?key=YOUR_KEY"` — JSON with `"root"` = works; the three 403s above tell you which case you're in. |
| Shadows never appear | Sun is below the horizon (check the readout), or the camera is > ~8 km away (`shadowMap.maximumDistance`). |
| Shadows point the wrong way | Check the **UTC offset** and the zone shown under it. It is set from a real time-zone lookup; if that script failed to load (offline / blocked CDN) it falls back to `round(lng / 15)`, which is ±1 h off in much of Europe — drag the slider to correct it. |
| Address search field empty / no suggestions | Needs the ion token (`geocoder: true` uses ion). |
| On a phone, typing an address made the other controls vanish | Fixed: iOS zoomed the page into the sub-16px search field and scrolled the document. All text fields are now ≥16px on phones, `body` is `position: fixed`, the viewport meta has `maximum-scale=1`, and the page snaps back to (0,0) on blur / keyboard close. |
