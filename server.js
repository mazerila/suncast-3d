const express = require('express');
const path = require('path');
const os = require('os');
const { sunPosition, daylight } = require('./lib/sun');

const app = express();
const PORT = process.env.PORT || 3003;
// 0.0.0.0 = listen on every network interface, so other devices on your LAN
// (or Tailscale, etc.) can reach it. Set HOST=127.0.0.1 to restrict to this
// machine only.
const HOST = process.env.HOST || '0.0.0.0';

// ---------------------------------------------------------------------------
// JSON API — sun position / daylight metrics for any lat/lng + date.
// Pure math (SunCalc), no API keys, read-only. See docs/API.md.
// ---------------------------------------------------------------------------

// Permissive CORS: responses are deterministic public-data calculations with
// no secrets and no side effects, so any origin may call them.
app.use('/api', (req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Cache-Control', 'public, max-age=3600');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const toNum = (v) => (v == null || v === '' ? NaN : Number(v));
const bad = (res, message) => res.status(400).json({ error: 'bad_request', message });

function readLatLng(req, res) {
  const lat = toNum(req.query.lat);
  const lng = toNum(req.query.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) { bad(res, 'lat must be a number in [-90, 90]'); return null; }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) { bad(res, 'lng must be a number in [-180, 180]'); return null; }
  return { lat, lng };
}

// GET /api/sun?lat=&lng=&datetime=<ISO-8601>   (datetime defaults to now)
app.get('/api/sun', (req, res) => {
  const ll = readLatLng(req, res);
  if (!ll) return;

  const when = req.query.datetime ? new Date(req.query.datetime) : new Date();
  if (Number.isNaN(when.getTime())) return bad(res, 'datetime must be an ISO-8601 string');

  res.json({ query: { ...ll, datetime: when.toISOString() }, ...sunPosition(when, ll.lat, ll.lng) });
});

// GET /api/daylight?lat=&lng=&date=YYYY-MM-DD&tzOffset=&minAltitude=&stepMinutes=
app.get('/api/daylight', (req, res) => {
  const ll = readLatLng(req, res);
  if (!ll) return;

  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad(res, 'date must be YYYY-MM-DD');

  const opts = {};
  if (req.query.tzOffset != null && req.query.tzOffset !== '') {
    const tz = toNum(req.query.tzOffset);
    if (!Number.isFinite(tz) || tz < -12 || tz > 14) return bad(res, 'tzOffset must be a number in [-12, 14]');
    opts.tzOffset = tz;
  }
  if (req.query.minAltitude != null && req.query.minAltitude !== '') {
    const ma = toNum(req.query.minAltitude);
    if (!Number.isFinite(ma) || ma < 0 || ma > 90) return bad(res, 'minAltitude must be a number in [0, 90]');
    opts.minAltitudeDeg = ma;
  }
  if (req.query.stepMinutes != null && req.query.stepMinutes !== '') {
    const sm = toNum(req.query.stepMinutes);
    if (!Number.isFinite(sm) || sm < 1 || sm > 240) return bad(res, 'stepMinutes must be a number in [1, 240]');
    opts.stepMinutes = sm;
  }

  try {
    res.json(daylight(date, ll.lat, ll.lng, opts));
  } catch (e) {
    return bad(res, e.message);
  }
});

// GET /api — tiny self-describing index
app.get('/api', (req, res) => {
  res.json({
    name: 'Suncast 3D API',
    version: 1,
    auth: 'none',
    endpoints: {
      'GET /api/sun': 'instantaneous sun position — lat, lng, [datetime]',
      'GET /api/daylight': 'daily daylight metrics — lat, lng, [date], [tzOffset], [minAltitude], [stepMinutes]',
    },
    docs: 'https://github.com/mazerila/suncast-3d/blob/main/docs/API.md',
  });
});

// ---------------------------------------------------------------------------
// Static viewer (public/) — everything that is not /api
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

function lanAddresses() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

app.listen(PORT, HOST, () => {
  console.log(`Suncast 3D running (viewer + JSON API under /api)`);
  console.log(`  this machine : http://localhost:${PORT}`);
  if (HOST === '127.0.0.1' || HOST === 'localhost') {
    console.log(`  (bound to localhost only — run with HOST=0.0.0.0 for LAN access)`);
  } else {
    for (const ip of lanAddresses()) {
      console.log(`  on your LAN  : http://${ip}:${PORT}`);
    }
    console.log(`  (macOS may prompt to allow "node" to accept incoming connections — click Allow)`);
  }
});
