// -----------------------------------------------------------------------------
// Copy this file to  public/config.local.js  and fill in your own keys.
// config.local.js is listed in .gitignore and is never committed.
//
// These values end up in the browser (this is a static front-end), so they are
// not "secret" from users of the deployed site. Keeping them out of the repo
// just avoids publishing them and lets each person use their own quota.
// Restrict the keys in their provider consoles (HTTP referrer + API limits).
// -----------------------------------------------------------------------------
window.CONFIG = {
  cesiumIonToken: "",    // https://ion.cesium.com/tokens
  googleMapsKey:  "",    // Google Cloud key with the Map Tiles API enabled
  autoLoad:       "osm"  // "osm", "google", or "" — what to load on page open
};
