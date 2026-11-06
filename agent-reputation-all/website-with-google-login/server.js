// Express server: serves the app, verifies Google sign-in on the server,
// keeps a signed login cookie, and stores a cross-device activity log for the admin.
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const SECRET = process.env.SESSION_SECRET || "";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const PROD = process.env.NODE_ENV === "production";

if (SECRET.length < 24) {
  console.error("Set SESSION_SECRET (24+ random characters) in .env");
  process.exit(1);
}
if (!CLIENT_ID) console.warn("GOOGLE_CLIENT_ID is empty: Google sign-in will not work until you set it.");

const gclient = new OAuth2Client(CLIENT_ID);
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use((_req, res, next) => { res.setHeader("X-Content-Type-Options", "nosniff"); next(); });

/* ---------- signed session cookie ---------- */
const sign = (o) => {
  const p = Buffer.from(JSON.stringify(o)).toString("base64url");
  return p + "." + crypto.createHmac("sha256", SECRET).update(p).digest("base64url");
};
const unsign = (tok) => {
  if (!tok || !tok.includes(".")) return null;
  const [p, s] = tok.split(".");
  const e = crypto.createHmac("sha256", SECRET).update(p).digest("base64url");
  if (s.length !== e.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(e))) return null;
  try { const o = JSON.parse(Buffer.from(p, "base64url").toString()); return o.exp > Date.now() ? o : null; }
  catch { return null; }
};
const getCookie = (req, n) => {
  const m = (req.headers.cookie || "").split(";").map((s) => s.trim()).find((s) => s.startsWith(n + "="));
  return m ? decodeURIComponent(m.slice(n.length + 1)) : null;
};
const sessionUser = (req) => unsign(getCookie(req, "sid"));
const isOwner = (u) => !!u && !!ADMIN_EMAIL && u.email === ADMIN_EMAIL;
const me = (u) => ({ id: u.sub, name: u.name, email: u.email, avatarUrl: u.picture || null, isOwner: isOwner(u), canEdit: isOwner(u) });

const needUser = (req, res, next) => {
  const u = sessionUser(req);
  if (!u) return res.status(401).json({ error: "not signed in" });
  req.u = u; next();
};
const needOwner = (req, res, next) =>
  needUser(req, res, () => (isOwner(req.u) ? next() : res.status(403).json({ error: "owner only" })));

/* ---------- activity store (JSON file) ---------- */
const FILE = path.join(__dirname, "data", "activity.json");
let store = { users: {} };
try { store = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { /* first run */ }
let saveT = null;
const persist = () => {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFile(FILE, JSON.stringify(store), () => {});
  }, 500);
};

/* ---------- routes ---------- */
app.get("/config.js", (_req, res) => {
  res.type("js").send("window.APP_CONFIG=" + JSON.stringify({ selfHost: true, googleClientId: CLIENT_ID }) + ";");
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential || typeof credential !== "string") return res.status(400).json({ error: "missing credential" });
    const ticket = await gclient.verifyIdToken({ idToken: credential, audience: CLIENT_ID });
    const p = ticket.getPayload();
    if (!p || !p.email || !p.email_verified) return res.status(401).json({ error: "unverified email" });
    const u = { sub: p.sub, name: p.name || p.email, email: p.email.toLowerCase(), picture: p.picture || "", exp: Date.now() + 7 * 86400e3 };
    res.setHeader("Set-Cookie",
      `sid=${encodeURIComponent(sign(u))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 86400}${PROD ? "; Secure" : ""}`);
    res.json(me(u));
  } catch (e) {
    res.status(401).json({ error: "invalid Google token" });
  }
});

app.get("/api/me", needUser, (req, res) => res.json(me(req.u)));

app.post("/api/logout", (_req, res) => {
  res.setHeader("Set-Cookie", `sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${PROD ? "; Secure" : ""}`);
  res.json({ ok: true });
});

// Each signed-in user writes only their own record: { d: { DEVICE_ID: [ {t, ts}, ... ] } }
app.post("/api/activity/doc", needUser, (req, res) => {
  const d = req.body && req.body.d;
  if (!d || typeof d !== "object") return res.status(400).json({ error: "bad body" });
  const rec = store.users[req.u.sub] || { name: req.u.name, d: {} };
  rec.name = req.u.name;
  for (const dev of Object.keys(d).slice(0, 10)) {
    if (!/^D[0-9A-F]{6}$/.test(dev) || !Array.isArray(d[dev])) continue;
    rec.d[dev] = d[dev].slice(-40)
      .filter((e) => e && typeof e.t === "string" && Number.isFinite(e.ts))
      .map((e) => ({ t: e.t.slice(0, 200), ts: e.ts }));
  }
  store.users[req.u.sub] = rec;
  persist();
  res.json({ ok: true });
});

// Owner only: everyone's activity
app.get("/api/activity", needOwner, (_req, res) => {
  res.json(Object.entries(store.users).map(([id, v]) => ({ id, name: v.name, d: v.d })));
});

app.get("/api/profiles", needOwner, (req, res) => {
  const ids = String(req.query.ids || "").split(",").filter(Boolean).slice(0, 100);
  const out = {};
  ids.forEach((id) => { if (store.users[id]) out[id] = { name: store.users[id].name }; });
  res.json(out);
});

app.use(express.static(path.join(__dirname, "public")));
app.listen(PORT, () => console.log(`Agent Reputation running on http://localhost:${PORT}`));
