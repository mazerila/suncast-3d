// Server-side sun math for the Suncast 3D HTTP API.
// Pure functions, no Cesium — just SunCalc (the same library the viewer uses
// client-side). "Open-sky" only: terrain and buildings are not considered.

const SunCalc = require('suncalc');

const R2D = 180 / Math.PI;

function round(n, dp) {
  if (n == null || Number.isNaN(n)) return null;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

// Rough UTC offset (whole hours) from longitude, used when the caller gives none.
// Ignores real time-zone borders and DST — callers that care pass tzOffset.
function estimateTzOffset(lng) {
  return Math.max(-12, Math.min(14, Math.round(lng / 15)));
}

// ISO-8601 string for `date` rendered at a fixed UTC offset (hours, may be
// fractional, e.g. 5.5). Returns null for an invalid/absent Date.
function isoWithOffset(date, offsetHours) {
  if (!date || Number.isNaN(date.getTime())) return null;
  const shifted = new Date(date.getTime() + offsetHours * 3600 * 1000);
  const p = (x, n = 2) => String(Math.trunc(Math.abs(x))).padStart(n, '0');
  const sign = offsetHours < 0 ? '-' : '+';
  const oh = p(offsetHours);
  const om = p(Math.round((Math.abs(offsetHours) % 1) * 60));
  return `${shifted.getUTCFullYear()}-${p(shifted.getUTCMonth() + 1)}-${p(shifted.getUTCDate())}` +
         `T${p(shifted.getUTCHours())}:${p(shifted.getUTCMinutes())}:${p(shifted.getUTCSeconds())}` +
         `${sign}${oh}:${om}`;
}

// Decimal local hour-of-day (0..24) for `date` at a given UTC offset.
function localHours(date, offsetHours) {
  if (!date || Number.isNaN(date.getTime())) return null;
  const d = new Date(date.getTime() + offsetHours * 3600 * 1000);
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
}

// Instantaneous sun position at a moment.
//   when : Date
//   returns { altitudeDeg, azimuthDeg, isNight }
// azimuth is compass-style: 0 = N, 90 = E, 180 = S, 270 = W.
function sunPosition(when, lat, lng) {
  const p = SunCalc.getPosition(when, lat, lng);
  const altitudeDeg = p.altitude * R2D;
  const azimuthDeg = (p.azimuth * R2D + 180 + 360) % 360; // SunCalc: 0 = S, +ve = W
  return {
    altitudeDeg: round(altitudeDeg, 2),
    azimuthDeg: round(azimuthDeg, 2),
    isNight: altitudeDeg <= 0,
  };
}

// Daily daylight metrics for one calendar date at a location.
//   dateStr : "YYYY-MM-DD" (interpreted in local time via tzOffset)
//   opts.tzOffset       : UTC offset in hours (default: estimated from longitude)
//   opts.minAltitudeDeg : sun must be at least this high to count as "direct sun"
//                         (default 0 — i.e. simply above the horizon)
//   opts.stepMinutes    : if > 0, include a `path` array sampled at this cadence
function daylight(dateStr, lat, lng, opts = {}) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr));
  if (!m) throw new RangeError('date must be in YYYY-MM-DD format');
  const year = +m[1], month = +m[2], day = +m[3];
  // Reject digit-shaped but unreal dates (2026-13-99, 2026-02-30, …) — JS Date
  // would otherwise silently roll them over into a different month.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new RangeError('date is not a real calendar date');
  }

  const tzOffset = opts.tzOffset != null ? opts.tzOffset : estimateTzOffset(lng);
  const minAlt = opts.minAltitudeDeg != null ? opts.minAltitudeDeg : 0;

  // UTC instant of local midnight and local noon for that calendar day.
  const localMidnightUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - tzOffset * 3600 * 1000);
  const localNoonUtc = new Date(localMidnightUtc.getTime() + 12 * 3600 * 1000);

  const times = SunCalc.getTimes(localNoonUtc, lat, lng);
  const noonPos = sunPosition(times.solarNoon, lat, lng);

  // Walk the local day minute by minute for robust duration figures
  // (works through polar day/night and near-horizon grazing).
  let daylightMin = 0;
  let directMin = 0;
  for (let min = 0; min < 1440; min++) {
    const alt = SunCalc.getPosition(new Date(localMidnightUtc.getTime() + min * 60000), lat, lng).altitude * R2D;
    if (alt > 0) daylightMin++;
    if (alt >= minAlt) directMin++;
  }

  const hasRise = times.sunrise && !Number.isNaN(times.sunrise.getTime());
  const hasSet = times.sunset && !Number.isNaN(times.sunset.getTime());

  const out = {
    query: {
      lat, lng, date: dateStr,
      tzOffsetHours: tzOffset,
      tzOffsetSource: opts.tzOffset != null ? 'caller' : 'estimated-from-longitude',
      minAltitudeDeg: minAlt,
    },
    sunrise: hasRise ? isoWithOffset(times.sunrise, tzOffset) : null,
    sunset: hasSet ? isoWithOffset(times.sunset, tzOffset) : null,
    solarNoon: isoWithOffset(times.solarNoon, tzOffset),
    sunriseHours: hasRise ? round(localHours(times.sunrise, tzOffset), 3) : null,
    sunsetHours: hasSet ? round(localHours(times.sunset, tzOffset), 3) : null,
    dayLengthHours: round(daylightMin / 60, 2),
    directSunHours: round(directMin / 60, 2),
    maxAltitudeDeg: noonPos.altitudeDeg,
    solarNoonAzimuthDeg: noonPos.azimuthDeg,
    polarDay: !hasRise && !hasSet && noonPos.altitudeDeg > 0,
    polarNight: !hasRise && !hasSet && noonPos.altitudeDeg <= 0,
  };

  if (opts.stepMinutes && opts.stepMinutes > 0) {
    const path = [];
    for (let min = 0; min <= 1440; min += opts.stepMinutes) {
      const when = new Date(localMidnightUtc.getTime() + min * 60000);
      const p = sunPosition(when, lat, lng);
      path.push({ time: isoWithOffset(when, tzOffset), altitudeDeg: p.altitudeDeg, azimuthDeg: p.azimuthDeg });
    }
    out.path = path;
  }

  return out;
}

module.exports = { sunPosition, daylight, estimateTzOffset };
