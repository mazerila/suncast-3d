# Deploying Suncast 3D to Firebase Hosting (+ Cloud Run for the API)

End result: the viewer at `https://<your-site>.web.app` and, if you want it, the
JSON API at `https://<your-site>.web.app/api/...`.

- **Viewer only** → free forever, no billing account needed (Firebase **Spark**
  plan). Do steps 1–7, then 10–13, and delete the `rewrites` block from
  `firebase.json` first (see step 7).
- **Viewer + API** → needs the **Blaze** (pay-as-you-go) plan, but a sun-math
  API stays inside the always-free tier (~$0). Do every step.

The repo already contains `firebase.json`, `.firebaserc`, `Dockerfile` and
`.dockerignore`, so there is nothing to scaffold — do **not** run
`firebase init` (it would overwrite them).

---

## 1. Create a Google account / project

1. Sign in with a Google account at <https://console.firebase.google.com>.
2. **Add project** → name it e.g. `Suncast 3D`.
3. Firebase proposes a **Project ID** (e.g. `suncast-3d` or `suncast-3d-4f9c1`
   if the short name is taken). **Write it down** — you need it in step 6.
4. Google Analytics: not needed, you can disable it.
5. Wait for "Your new project is ready" → **Continue**.

## 2. (Viewer + API only) Enable billing — Blaze plan

Skip this for viewer-only.

1. In the Firebase console, bottom-left, click the plan name (**Spark**) →
   **Select plan** → **Blaze**.
2. Create or pick a **Cloud Billing account** (needs a credit card). Google's
   always-free tiers still apply; you are only billed above them.
3. Recommended: set a **budget alert** — Google Cloud Console →
   **Billing → Budgets & alerts** → create a budget of e.g. €1 with email
   alerts, so you notice any unexpected usage.

## 3. Pick the hosting URL

- The default site is `https://<project-id>.web.app` (and `.firebaseapp.com`).
- To get a shorter name like `suncast.web.app`, add a **Hosting site**:
  Firebase console → **Build → Hosting → Add another site** → site ID
  `suncast` (only if it is free — `.web.app` names are first-come).
- If you add a named site, note the site ID; you will point the deploy at it in
  step 6.

## 4. Install the CLIs

```bash
# Firebase CLI (always needed)
npm install -g firebase-tools
firebase login          # opens a browser to authorise

# Google Cloud CLI — only for the API (Cloud Run). Install:
#   macOS:  brew install --cask google-cloud-sdk
#   other:  https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud config set project <PROJECT_ID>      # from step 1
```

## 5. Your API keys — only the Cesium token is published

Keep your keys in `public/config.local.js` (git-ignored, machine-only):

```bash
cp public/config.local.example.js public/config.local.js   # if you don't have it
# then edit public/config.local.js and fill in:
#   cesiumIonToken: "..."     (required — free; this one IS published)
#   googleMapsKey:  "..."     (optional, paid — stays on your machine, NEVER published)
```

`firebase.json` **excludes** `config.local.js` from every upload. Instead its
`predeploy` hook runs `scripts/build-public-config.js`, which writes
`public/config.public.js` containing **only** the allow-listed
`cesiumIonToken`. That generated file is what the live site loads. The Google
key therefore never leaves your machine — visitors who want Google
Photorealistic paste their own key into the panel (it stays in their browser).

CI does the same thing from a secret (see the CI/CD section) and needs no
Google key at all.

## 6. Point the repo at your project

Edit **`.firebaserc`** and replace the placeholder with your Project ID:

```json
{
  "projects": { "default": "suncast-3d-4f9c1" }
}
```

If you created a **named Hosting site** in step 3 (e.g. `suncast`), also add a
`"site"` key to the `hosting` block of **`firebase.json`**:

```json
"hosting": {
  "site": "suncast",
  "public": "public",
  ...
}
```

## 7. Choose viewer-only vs viewer + API

`firebase.json` ships with **no `rewrites` block** by default, so a plain
`firebase deploy --only hosting` gives you the viewer only — this is exactly
what happened on the live `suncast.web.app`: Blaze wasn't finished yet, so the
`/api` rewrite was left out to unblock the deploy.

- **Viewer only**: nothing to do — you already have it. Jump to step 10.
- **Viewer + API**: once Cloud Run is deployed (step 8), add the rewrite back
  into the `hosting` block of `firebase.json`:
  ```json
  "rewrites": [
    { "source": "/api/**", "run": { "serviceId": "suncast-api", "region": "europe-west1" } }
  ]
  ```
  then redeploy Hosting (step 10). Deploying Hosting with this block present
  **before** the Cloud Run service exists fails with a 403/"Cloud Run Admin API
  has not been used" error — deploy Cloud Run first.

If you want the API in a different region, change it in **both** places: the
`rewrites` block above, and the `--region` flag in step 8. `europe-west1`
(Belgium) is a good default for Europe.

## 8. (API) Deploy the server to Cloud Run

From the repo root:

```bash
gcloud run deploy suncast-api \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 3
```

- The first run asks to enable the **Cloud Run**, **Cloud Build** and
  **Artifact Registry** APIs — answer **y**.
- It builds the image from `Dockerfile`, pushes it, and deploys. Takes 2–4 min.
- `--min-instances 0` = scales to zero when idle, so you pay nothing between
  requests. `--allow-unauthenticated` = the API is public (it only does public
  astronomy math).
- On success it prints a **Service URL** like
  `https://suncast-api-abc123-ew.a.run.app`.

Test it directly:

```bash
curl "https://suncast-api-abc123-ew.a.run.app/api/daylight?lat=48.85&lng=2.35&date=2026-06-21&tzOffset=2"
```

The `serviceId` (`suncast-api`) and `region` (`europe-west1`) must match
`firebase.json`.

## 9. (API) Redeploy the API later

Any time `server.js` or `lib/sun.js` changes:

```bash
gcloud run deploy suncast-api --source . --region europe-west1
```

## 10. Deploy Hosting

```bash
firebase deploy --only hosting
```

Output ends with:

```
Hosting URL: https://<your-site>.web.app
```

## 11. Lock the API keys to the live domain

Now that you know the URL, restrict the keys so they only work there:

- **Cesium ion**: <https://ion.cesium.com/tokens> → your token → set the
  **allowed URL / origin** to `https://<your-site>.web.app`.
- **Google Maps**: Google Cloud Console → **APIs & Services → Credentials** →
  your Maps key → **Application restrictions → Websites** → add
  `https://<your-site>.web.app/*`. Keep **API restrictions → Map Tiles API**.

## 12. Verify

Open `https://<your-site>.web.app`:

- 3D buildings load, shadows render, the sun readout updates.
- **Locate** (my location) works (the site is HTTPS).
- If you deployed the API:
  `https://<your-site>.web.app/api/daylight?lat=48.85&lng=2.35&date=2026-06-21`
  returns JSON.

## 13. Redeploy after changes

| Changed | Command |
|---------|---------|
| Anything in `public/` (the viewer) | `firebase deploy --only hosting` |
| `server.js` / `lib/sun.js` (the API) | `gcloud run deploy suncast-api --source . --region europe-west1` |
| `firebase.json` rewrites/headers | `firebase deploy --only hosting` |

---

## CI/CD: auto-deploy the viewer on every merge to `main`

`.github/workflows/firebase-hosting-merge.yml` is already in the repo. It runs
on every push to `main` (i.e. every merged PR), writes
`public/config.public.js` from a GitHub secret (only the Cesium token — the
Google key is never part of a deploy), and deploys Hosting. It deploys **only
the viewer** — the `/api` Cloud Run service is not part of this workflow.

The workflow's first step checks the secrets and fails with a plain-English
message naming any that is missing, so the Actions log tells you exactly what
to add.

**One-time setup — 2 repository secrets needed:**

1. **`FIREBASE_SERVICE_ACCOUNT_SUNCAST_3D`** — a Google service-account JSON.
   Either:
   - **CLI (one command):**
     ```bash
     firebase init hosting:github
     ```
     Repo = `mazerila/suncast-3d`; authorize in the browser; build script
     **N**; auto-deploy on merge **Y**; branch `main`; when asked to overwrite
     `.github/workflows/firebase-hosting-merge.yml` answer **N** (keep the
     repo's version). It creates the service account and uploads the secret
     itself, regardless of that last answer.
   - **Browser only:** Firebase console → ⚙️ *Project settings* →
     *Service accounts* → **Generate new private key** → a `.json` downloads.
     GitHub → repo → *Settings → Secrets and variables → Actions → New
     repository secret* → name `FIREBASE_SERVICE_ACCOUNT_SUNCAST_3D`, value =
     the entire contents of that `.json`. Delete the file afterwards.
2. **`CESIUM_ION_TOKEN`** — same GitHub Secrets page → New repository secret →
   value = the `cesiumIonToken` string from your local `public/config.local.js`.

That's all. (No `GOOGLE_MAPS_KEY` secret — by design.) Then **Actions → latest
run → Re-run all jobs**, or merge anything into `main`; it deploys to
`https://suncast.web.app` in about a minute.

---

## Staying inside the free tier

| Service | Always-free allowance | Notes |
|---------|----------------------|-------|
| Firebase Hosting | 10 GB stored, 360 MB/day transfer (Spark) / 10 GB-month (Blaze) | CesiumJS & SunCalc load from their own CDNs, so your transfer is tiny (just `index.html` + `config.local.js`). |
| Cloud Run | 2M requests, 360k GB-s, 180k vCPU-s per month | `--min-instances 0` ⇒ no cost when idle. A daylight request is a few ms of CPU. |
| Cloud Build | 120 build-min/day | Only used when you deploy the API. |

Set the budget alert from step 2 and you will hear about any surprise.

## Custom domain (optional)

Firebase console → **Hosting → Add custom domain** → enter `suncast.example.com`,
add the TXT/A records it shows to your DNS. Firebase provisions the TLS
certificate automatically. Then add that domain to the key restrictions in
step 11 too.
