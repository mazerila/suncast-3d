# Analytics — what Suncast 3D measures, and how

Product analytics run on **PostHog (EU cloud)**, **cookieless**: no cookie,
no localStorage, nothing to consent to, so there is no banner. The whole
integration is one file, `public/analytics.js`, loaded first in `index.html`;
the app only ever calls `track(event, props)`.

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
size, `$timezone`, and a `$pageview` / `$pageleave` pair per page load. Every
URL-like property is **scrubbed** first (see Privacy notes): `lat`, `lng`,
`heading`, `pitch` and `range` are removed, so a deep link shows up as
`https://suncast.web.app/?date=…&time=…`.

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

## Cookieless mode — what it means for the numbers

`posthog.init` runs with `cookieless_mode: 'always'` and
`person_profiles: 'never'`, and the PostHog project setting **Cookieless
tracking** (server hash mode, stateful) is on. Consequences:

- The browser sends the `$posthog_cookieless` sentinel instead of an id; the
  server derives a visitor id from a **hash of IP + user agent + host with a
  daily salt**. Nothing identifying is stored in the browser, and the hash
  cannot be reversed or joined across days.
- **Unique visitors are per day.** There is no cross-day retention, and a
  weekly/monthly "unique visitors" figure is inflated (the same person counts
  once per day). Use **sessions** and pageviews for week/month trends.
- **Session replay and GeoIP country are not available** in this mode.
  `$timezone` (e.g. `Europe/Paris`) is the country proxy.
- Dashboard tiles were changed to match: *Countries* → *Visitor time zones*,
  *Retention* → *Engagement depth*, *Weekly active* → *Sessions & pageviews
  per week*.
- Returning visitors from the first, cookie-based deploy (a few hours on
  2026-09-22) had a `ph_<token>_posthog` cookie/localStorage entry;
  `analytics.js` deletes it on load so they become cookieless too (PostHog
  would otherwise keep the old id via `register_once`).

## Privacy notes — read before changing the config

- **No cookie, no localStorage, no consent banner** (see above). This also
  holds inside embeds on other sites.
- **No person profiles, no `identify`**: visitors are anonymous events only.
- **Coordinates never leave the browser in analytics.** The custom events
  don't carry them, and a `before_send` hook scrubs `lat`, `lng`, `heading`,
  `pitch` and `range` from every URL-like property — `$current_url`,
  `$referrer`, `$pathname`, the `$set_once` initial-URL fields — before the
  event is sent. A visitor's home after "Locate" → "Link", or the listing an
  embed shows, is therefore not in PostHog.
- **Addresses are masked.** PostHog's autocapture masks form inputs anyway;
  the address search box (`.cesium-geocoder-input`) and the reverse-geocoded
  address line (`#addr`) additionally carry the `ph-no-capture` class, so
  neither their text nor a click on them is captured.
- Autocapture still records the *text* of other clicked elements (button
  labels), browser/OS, screen size and `$timezone`.
- The published token is write-only; anyone can send junk events with it
  (true of every browser analytics tool). Dashboards filter on
  `product = suncast` and drop `is_test`.
