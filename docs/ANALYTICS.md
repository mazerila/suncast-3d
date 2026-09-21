# Analytics — what Suncast 3D measures, and how

Product analytics run on **PostHog (EU cloud)**. The whole integration is one
file, `public/analytics.js`, loaded first in `index.html`; the app only ever
calls `track(event, props)`.

| | |
|---|---|
| Project | "armo products", id `280761` (shared with the other products; every Suncast event carries `product = suncast`, dashboards filter on it) |
| Dashboard | <https://eu.posthog.com/project/280761/dashboard/966672> |
| Host | `https://eu.i.posthog.com` (EU data residency) |
| Token | `phc_rDzj…` in `analytics.js` — a **public, write-only** project key. It can only send events, not read them, so it is fine in the repo and on the site. |

## When it is on

- **On** on `suncast.web.app` (and any other public hostname).
- **Off** on `localhost`, `127.*`, private LAN ranges and `file:` — `window.track`
  is a no-op, so local testing never pollutes the numbers.
- `?analytics=1` in the URL forces it on anywhere. Those events carry
  `is_test = true` and the dashboards exclude them — that is how to test the
  pipeline end to end from a dev server.

## What every event carries (super properties)

Registered once per page load with `posthog.register`, attached to every event
including PostHog's own autocaptured ones:

| Property | Values | Meaning |
|---|---|---|
| `product` | `suncast` | Which product in the shared project |
| `app_mode` | `full` · `embed` | `/` vs `/embed/…` (or `?embed=1`) |
| `embed_host` | hostname · `unknown` | In embed mode only: the embedding site (from `document.referrer`) |
| `is_test` | `true` · absent | Set when `?analytics=1` forced analytics on |

PostHog's defaults also add `$current_url`, `$referrer`, browser/OS, screen
size, and a `$pageview` / `$pageleave` pair per page load.

## Custom events

All fired from `public/index.html`; grep for `track(`.

| Event | Properties | Fired when |
|---|---|---|
| `app_started` | `start_mode`: `deeplink` · `geolocation` · `fallback` · `embed_no_location`; `has_cesium_token`; `lang`; `lang_source` (`url` · `saved` · `browser` · `region` · `fallback`); `sun_path_on`; on fallback also `reason` | Once per load, once the starting place is decided. The funnel starts here. |
| `location_changed` | `method`: `address` · `coords` · `geolocation` · `map_click` | A new target was chosen (search, Go, Locate, click on the map) |
| `buildings_loaded` | `source`: `osm` · `google` | 3D buildings finished loading |
| `buildings_load_failed` | `source`; `error` (HTTP status + message) | …or failed |
| `sun_hours_computed` | `sun_minutes`; `daylight_minutes`; `shaded_spans` | The direct-sun computation finished for a spot |
| `day_played` | — | ▶ pressed (once per play, not per pause) |
| `time_changed` | `via`: `slider` | Time slider moved (debounced 1.5 s) |
| `date_changed` | `via`: `input` · `chip`; on chip also `preset` (`today` · `03-20` · `06-21` · `09-22` · `12-21`) | Date picked |
| `timezone_changed` | — | UTC-offset slider moved by hand (debounced) |
| `link_copied` | — | "Link" pressed |
| `camera_action` | `action`: `rotate_left` · `rotate_right` · `spin` · `reset` · `zoom_in` · `zoom_out` · `compass_north` | Any camera button |
| `language_changed` | `from`; `to` | Picked from the flag menu (automatic detection does not fire it) |
| `panel_toggled` | `open`; `via`: `toggle` · `timebar` · `close` | Controls panel shown / hidden |
| `geolocation_failed` | `code` (1 denied · 2 unavailable · 3 timeout); `where`: `button` | "Locate" failed |
| `embed_open_full_app` | — | The "Suncast 3D ↗" badge clicked inside an embed |

Deliberately **not** in any custom event: coordinates, addresses, the
Cesium/Google keys, or anything typed into a field.

## Adding an event

```js
track('thing_happened', { how: 'button' });          // one-off
trackLater('thing_changed', { via: 'slider' });      // high-frequency controls: 1.5 s debounce per event name
```

- Names: `snake_case`, past tense, noun first (`buildings_loaded`), so they
  sort together in PostHog.
- Properties: short enum strings and numbers. Never a coordinate, an address,
  free text the user typed, or a key.
- `track` is always defined (a no-op when analytics is off), so no guard is
  needed. Put the call at the top of the handler, before early returns you
  don't want counted (see `btn-fly`: invalid coordinates are not a
  `location_changed`).
- Add the new event to the table above.

## Privacy notes — read before changing the config

- `person_profiles: 'identified_only'` and the app never calls
  `posthog.identify`, so visitors stay **anonymous events**: no person rows,
  no cross-site identity.
- **Inputs are masked** by PostHog's autocapture, so the address search box,
  coordinates and key fields are never captured. Autocapture does record the
  *text* of clicked elements.
- **Session replay and heatmaps** are limited by the project settings to
  `suncast.web.app` (PostHog "authorized domains"), so an embed on another
  site is never recorded.
- **Locations can still reach PostHog through the URL.** `$current_url` is
  captured on every pageview, and Suncast deep links carry `?lat=…&lng=…` —
  a visitor's own home after "Locate" → "Link", or the listing an embed shows.
  The custom events avoid this on purpose; the pageview does not. If that is
  more than you want, strip `lat`/`lng` in a `sanitize_properties` hook in
  `analytics.js`, or turn `capture_pageview` off and rely on `app_started`.
- **Cookies.** `persistence: 'localStorage+cookie'` stores an anonymous
  distinct id in a first-party cookie, also inside embeds. There is no consent
  banner. Under French/EU rules that is the point to revisit if the audience
  grows: PostHog's cookieless mode (`persistence: 'memory'`) needs no consent
  at the price of not recognising returning visitors.
- The published token is write-only; anyone can send junk events with it
  (true of every browser analytics tool). Dashboards filter on
  `product = suncast` and drop `is_test`.
