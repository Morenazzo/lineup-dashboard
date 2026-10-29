/**
 * The Lineup page was written for Claude's artifact runtime: it asks window.claude.use()
 * for a shared database ("db"), a model ("sample") and the viewer ("user"). This script
 * provides the same three things in your own deployment, backed by /api/lineup, so the
 * page itself stays as it was designed. It runs before the page script.
 *
 * Snapshots are polled (every 20 seconds, and when the tab comes back). A poll answer is
 * dropped if a save started or finished meanwhile, so it can never undo a change that was
 * just made. It is plain ES5-style JavaScript in a string: no backticks or dollar braces.
 */
export const LINEUP_SHIM = String.raw`
(function () {
  var POLL_MS = 20000;
  var inflight = 0;
  var epoch = 0;

  function fail(code) {
    var e = new Error(code);
    e.code = code;
    return e;
  }

  function call(url, init) {
    return fetch(url, Object.assign({ credentials: "same-origin", headers: { "content-type": "application/json" } }, init)).then(
      function (r) {
        if (r.ok) return r.status === 204 ? null : r.json();
        throw fail(r.status === 413 ? "quota_exceeded" : r.status === 401 || r.status === 403 ? "unauthenticated" : "unavailable");
      },
      function () {
        throw fail("revoked");
      }
    );
  }

  function write(method, body) {
    inflight++;
    epoch++;
    return call("/api/lineup/db", { method: method, body: JSON.stringify(body) }).then(
      function () { inflight--; epoch++; },
      function (e) { inflight--; epoch++; throw e; }
    );
  }

  function watch(coll, onDocs, onError) {
    var last = null;
    var stopped = false;
    var timer = null;
    function schedule() {
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    }
    function tick() {
      clearTimeout(timer);
      if (stopped) return;
      if (inflight || document.hidden) { schedule(); return; }
      var started = epoch;
      call("/api/lineup/db?coll=" + encodeURIComponent(coll)).then(
        function (res) {
          if (stopped || inflight || epoch !== started) return;
          var text = JSON.stringify(res.docs);
          if (text !== last) { last = text; onDocs(res.docs); }
        },
        function (e) { if (onError) onError(e); }
      ).then(schedule);
    }
    function onVisible() { if (!document.hidden) tick(); }
    document.addEventListener("visibilitychange", onVisible);
    tick();
    return function () {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }

  var db = {
    doc: function (path) {
      var parts = path.split("/");
      var coll = parts[0];
      var id = parts[1];
      return {
        set: function (data) { return write("PUT", { coll: coll, id: id, data: data }); },
        delete: function () { return write("DELETE", { coll: coll, id: id }); },
        onSnapshot: function (cb, onError) {
          return watch(coll, function (docs) {
            var found = docs.filter(function (d) { return d.id === id; })[0];
            cb({ exists: !!found, id: id, data: function () { return found ? found.data : undefined; } });
          }, onError);
        }
      };
    },
    collection: function (coll) {
      return {
        onSnapshot: function (cb, onError) {
          return watch(coll, function (docs) {
            cb({ docs: docs.map(function (d) { return { id: d.id, data: function () { return d.data; } }; }) });
          }, onError);
        }
      };
    }
  };

  function sample(input, opts) {
    opts = opts || {};
    return fetch("/api/lineup/sample", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: input, model: opts.model || "" })
    }).then(
      function (r) {
        if (!r.ok || !r.body) throw fail(r.status === 429 ? "rate_limited" : "failed");
        var reader = r.body.getReader();
        var decoder = new TextDecoder();
        var text = "";
        function pump() {
          return reader.read().then(function (chunk) {
            if (chunk.done) return;
            text += decoder.decode(chunk.value, { stream: true });
            if (opts.onText) opts.onText({ text: text });
            return pump();
          });
        }
        return pump().then(function () {
          if (!text.trim()) throw fail("failed");
          return { text: text, modelApplied: opts.model || "" };
        });
      },
      function () { throw fail("failed"); }
    );
  }

  var services = {
    db: db,
    sample: sample,
    user: { isOwner: function () { return Promise.resolve(true); } }
  };

  window.claude = {
    use: function (name) {
      return services[name] ? Promise.resolve(services[name]) : Promise.reject(fail("unsupported"));
    }
  };
})();
`;
