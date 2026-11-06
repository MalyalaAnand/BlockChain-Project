// Replaces the claude.ai runtime used by the hosted version with calls to server.js,
// so the same page works in any browser.
(function () {
  function j(u, o) {
    return fetch(u, Object.assign({ credentials: "include", headers: { "Content-Type": "application/json" } }, o || {}))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  var USR = {
    me: function () { return j("/api/me"); },
    profiles: function (ids) { return j("/api/profiles?ids=" + encodeURIComponent(ids.join(","))).catch(function () { return {}; }); }
  };
  function write(o) { return j("/api/activity/doc", { method: "POST", body: JSON.stringify({ d: o.d }) }); }
  var DB = {
    doc: function () { return { update: write, set: write, delete: function () { return Promise.resolve(); } }; },
    collection: function () {
      return {
        add: function () { return Promise.resolve(); },
        onSnapshot: function (cb, err) {
          function tick() {
            j("/api/activity").then(function (rows) {
              cb({ docs: rows.map(function (r) { return { id: r.id, data: function () { return r; } }; }) });
            }).catch(function (e) { if (err) err(e); });
          }
          tick();
          var t = setInterval(tick, 8000);
          return function () { clearInterval(t); };
        }
      };
    }
  };
  window.claude = { use: function (n) { return Promise.resolve(n === "user" ? USR : n === "db" ? DB : null); } };
  window.googleServerLogin = function (credential) {
    return j("/api/auth/google", { method: "POST", body: JSON.stringify({ credential: credential }) });
  };
  var st = document.createElement("style");
  st.textContent = ".cc{display:none!important}"; // "Continue with Claude" only exists on claude.ai
  document.head.appendChild(st);
})();
