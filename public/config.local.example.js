// -----------------------------------------------------------------------------
// Copy this file to  public/config.local.js  and fill in your own keys.
//
// config.local.js stays on YOUR machine: it is git-ignored AND `firebase deploy`
// never uploads it. At deploy time, scripts/build-public-config.js copies only
// the allow-listed keys (just cesiumIonToken) into public/config.public.js,
// which is what the live site loads. So:
//   • cesiumIonToken  – free tier; safe to publish; gets deployed.
//   • googleMapsKey   – paid; NEVER deployed. Visitors who want Google
//                       Photorealistic paste their own key into the panel.
// Restrict the keys in their provider consoles anyway (HTTP referrer + API).
// -----------------------------------------------------------------------------
window.CONFIG = Object.assign(window.CONFIG || {}, {
  cesiumIonToken: "",   // https://ion.cesium.com/tokens  — OSM 3D buildings load automatically when set
  googleMapsKey:  "",   // Google Cloud key with the Map Tiles API enabled — local use only
});
