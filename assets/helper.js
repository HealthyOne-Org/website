/* Hardaway Labs site helper: quick-reply questions + AI answers.
   Answers go to PostHog as helper_* events. AI answers come from /api/helper. */
(function () {
  if (window.__hhLoaded) return;
  window.__hhLoaded = true;

  // ---------- PostHog (load only if the page doesn't already) ----------
  if (!window.posthog) {
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register identify setPersonProperties reset get_distinct_id".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    window.posthog.init("phc_jbeSYaK5OAsl5qbZbnsJYU3N3m5258lEZbVWoLWxPWo", { api_host: "https://us.i.posthog.com", person_profiles: "identified_only" });
  }
  var path = location.pathname || "/";
  function track(ev, props) {
    try {
      var p = props || {};
      p.page = path; p.context = CTX;
      window.posthog && window.posthog.capture(ev, p);
    } catch (e) {}
  }
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }

  // ---------- Page context ----------
  var CTX = /healthy-faith|\/fdb|\/hf(\/|$)/.test(path) ? "faith"
    : /^\/(apps|tiktok|tt|about|hardawaylabs|partners|respond)/.test(path) ? "general"
    : "healthyone";

  var LINKS = {
    healthyone: [
      ["iPhone", "https://apps.apple.com/us/app/healthyone-nutrition-tracker/id6757052428?pt=128318750&ct=web_helper&mt=8", "healthyone_ios"],
      ["Android", "https://play.google.com/store/apps/details?id=com.hardawaylabs.healthyone&referrer=utm_source%3Dhealthyoneapp.com%26utm_medium%3Dhelper", "healthyone_android"]
    ],
    faith: [
      ["iPhone", "https://apps.apple.com/us/app/healthy-faith-bible-study/id6781374849?pt=128318750&ct=web_helper&mt=8", "healthyfaith_ios"],
      ["Android", "https://play.google.com/store/apps/details?id=com.healthyone.healthyfaith&referrer=utm_source%3Dhealthyoneapp.com%26utm_medium%3Dhelper", "healthyfaith_android"]
    ],
    general: [["See all our apps", "/apps", "apps_page"]]
  };
  var REASONS = {
    healthyone: ["Tracking on a GLP-1", "Eating more protein", "Losing weight", "Just exploring"],
    faith: ["Bible study", "Sermon notes", "Daily Bible reading", "Just exploring"],
    general: ["Nutrition / GLP-1", "Bible / faith", "Recipes", "Something else"]
  };
  var PRICE = {
    healthyone: "HealthyOne is free to download. HealthyOne Plus is $7.99/month or $59.99/year, and you get a 7-day free trial first.",
    faith: "Reading, challenges and circles in Healthy Faith are always free. Premium (audio listening, Ask and sermon notes) is $3.99/month or $29.99/year with a 30-day free trial. Want a 100% free Bible? Faith Daily Bible is free with no ads.",
    general: "Every app is free to start. HealthyOne Plus is $7.99/month with a 7-day free trial, and Healthy Faith Premium is $3.99/month with a 30-day free trial."
  };

  // ---------- Styles ----------
  var css = "\
#hh-root{position:fixed;right:16px;bottom:calc(16px + var(--hh-off,0px));z-index:2147483000;font:15px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A2332}\
#hh-root *{box-sizing:border-box}\
#hh-fab{width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;background:#1A2332;color:#fff;box-shadow:0 0 0 4px #4ECDC4,0 8px 24px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;margin-left:auto}\
#hh-fab svg{width:26px;height:26px}\
#hh-tease{position:absolute;right:0;bottom:72px;background:#fff;border-radius:14px;padding:10px 34px 10px 14px;box-shadow:0 6px 24px rgba(0,0,0,.18);white-space:nowrap;cursor:pointer;font-weight:600}\
#hh-tease b{position:absolute;right:10px;top:8px;font-weight:400;color:#718096}\
#hh-panel{position:absolute;right:0;bottom:72px;width:370px;max-width:calc(100vw - 32px);height:540px;max-height:calc(100vh - 110px);background:#14171c;color:#fff;border-radius:22px;box-shadow:0 18px 50px rgba(0,0,0,.35);display:none;flex-direction:column;overflow:hidden}\
#hh-panel.open{display:flex}\
.hh-head{display:flex;align-items:center;gap:12px;padding:16px 16px 14px;border-bottom:1px solid #262b33}\
.hh-av{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#A8E6CF,#4ECDC4);display:flex;align-items:center;justify-content:center;color:#1A2332;font-weight:800}\
.hh-t{font-weight:700}.hh-s{font-size:13px;color:#9aa3ad}\
.hh-x{margin-left:auto;background:none;border:0;color:#9aa3ad;font-size:24px;cursor:pointer;line-height:1}\
.hh-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}\
.hh-m{max-width:85%;padding:10px 14px;border-radius:16px;background:#262b33;align-self:flex-start;white-space:pre-wrap}\
.hh-m.me{align-self:flex-end;background:#4ECDC4;color:#10221f;font-weight:600}\
.hh-m a{color:#A8E6CF}\
.hh-typing{opacity:.6}\
.hh-opts{display:flex;flex-wrap:wrap;gap:8px;padding:10px 14px;border-top:1px solid #262b33}\
.hh-opts:empty{display:none}\
.hh-o{background:transparent;color:#fff;border:1px solid #3a414c;border-radius:999px;padding:8px 14px;font:inherit;font-size:14px;cursor:pointer}\
.hh-o:hover{border-color:#4ECDC4}\
.hh-o.dl{background:#4ECDC4;border-color:#4ECDC4;color:#10221f;font-weight:700;text-decoration:none}\
.hh-in{display:flex;gap:8px;padding:10px 14px 14px}\
.hh-in input{flex:1;min-width:0;background:#262b33;border:1px solid #3a414c;border-radius:12px;color:#fff;padding:10px 12px;font:inherit;font-size:16px}\
.hh-in button{background:#4ECDC4;border:0;border-radius:12px;padding:0 14px;font-weight:700;color:#10221f;cursor:pointer}\
.hh-note{font-size:11px;color:#6b737d;text-align:center;padding:0 14px 10px}\
@media (max-width:480px){#hh-panel{position:fixed;left:8px;right:8px;bottom:calc(84px + var(--hh-off,0px));width:auto;max-width:none;height:min(540px,calc(100vh - 100px))}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // ---------- DOM ----------
  var root = document.createElement("div"); root.id = "hh-root";
  root.innerHTML =
    '<div id="hh-panel" role="dialog" aria-label="Hardaway Labs helper">' +
      '<div class="hh-head"><div class="hh-av">H</div><div><div class="hh-t">Hardaway Labs</div><div class="hh-s">AI helper &middot; Chris reads every answer</div></div><button class="hh-x" aria-label="Close">&times;</button></div>' +
      '<div class="hh-log"></div><div class="hh-opts"></div>' +
      '<form class="hh-in" style="display:none"><input maxlength="500" placeholder="Ask about our apps..." aria-label="Your message"><button type="submit">Send</button></form>' +
      '<div class="hh-note" style="display:none">AI answers can be wrong. Not medical advice.</div>' +
    '</div>' +
    '<button id="hh-fab" aria-label="Open chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>';
  function mount() { document.body.appendChild(root); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  var panel = root.querySelector("#hh-panel"), log = root.querySelector(".hh-log"),
      opts = root.querySelector(".hh-opts"), form = root.querySelector(".hh-in"),
      input = form.querySelector("input"), note = root.querySelector(".hh-note");
  var started = false, convo = [], mode = "ask", tease = null;

  function scroll() { log.scrollTop = log.scrollHeight; }
  function say(text, me, html) {
    var d = document.createElement("div"); d.className = "hh-m" + (me ? " me" : "");
    if (html) d.innerHTML = text; else d.textContent = text;
    log.appendChild(d); scroll(); return d;
  }
  function bot(lines, then) {
    var i = 0;
    (function next() {
      if (i >= lines.length) { then && then(); return; }
      var t = say("...", false); t.classList.add("hh-typing");
      setTimeout(function () { t.classList.remove("hh-typing"); t.textContent = lines[i++]; scroll(); next(); }, 450);
    })();
  }
  function choices(list, cb) {
    opts.innerHTML = "";
    list.forEach(function (c) {
      var b = document.createElement("button"); b.type = "button"; b.className = "hh-o"; b.textContent = c;
      b.onclick = function () { opts.innerHTML = ""; say(c, true); cb(c); };
      opts.appendChild(b);
    });
    scroll();
  }
  function downloads() {
    opts.innerHTML = "";
    LINKS[CTX].forEach(function (l) {
      var a = document.createElement("a"); a.className = "hh-o dl"; a.href = l[1]; a.textContent = l[0];
      if (/^http/.test(l[1])) { a.target = "_blank"; a.rel = "noopener"; }
      a.onclick = function () { track("helper_link_click", { target: l[2] }); };
      opts.appendChild(a);
    });
    var e = document.createElement("button"); e.type = "button"; e.className = "hh-o"; e.textContent = "Leave my email";
    e.onclick = askEmail; opts.appendChild(e);
  }
  function showInput(placeholder, m) {
    mode = m || "ask"; form.style.display = "flex"; note.style.display = mode === "ask" ? "block" : "none";
    input.type = mode === "email" ? "email" : "text";
    input.placeholder = placeholder || "Ask about our apps...";
  }

  // ---------- Script ----------
  function answer(step, q, a) { track("helper_answer", { step: step, question: q, answer: a }); }

  function start() {
    started = true;
    track("helper_opened");
    if (store("hh_done")) {
      bot(["Welcome back! Ask me anything about our apps."], function () { showInput(); downloads(); });
      return;
    }
    bot(["Hi! I'm the Hardaway Labs helper.", "Mind 3 quick questions? No sales pitch, it just helps us build better apps."], function () {
      choices(["Sure", "Just looking around", "I have a question"], function (c) {
        answer(0, "Mind 3 quick questions?", c);
        if (c === "I have a question") { bot(["Ask away!"], function () { showInput(); }); return; }
        bot(c === "Sure" ? ["Thank you!"] : ["No pressure, take your time."], q1);
      });
    });
  }
  function q1() {
    var q = "What brought you here today?";
    bot([q], function () { choices(REASONS[CTX], function (c) { answer(1, q, c); bot(["Got it, thanks."], q2); }); });
  }
  function q2() {
    var q = "How did you hear about us?";
    bot([q], function () {
      choices(["TikTok", "Instagram", "Google search", "App Store", "A friend or church", "Other"], function (c) {
        answer(2, q, c);
        try { window.posthog.register({ heard_from: c }); } catch (e) {}
        q3();
      });
    });
  }
  function q3() {
    var q = "What would make you try the app today?";
    bot([q], function () {
      choices(["Seeing how it works", "Knowing the price", "Android version", "Nothing, I'll download soon"], function (c) {
        answer(3, q, c);
        store("hh_done", "1");
        var r;
        if (c === "Knowing the price") r = [PRICE[CTX]];
        else if (c === "Android version") r = ["HealthyOne, Healthy Faith, Recipella and Faith Daily Bible are all on Google Play."];
        else if (c === "Seeing how it works") r = ["The App Store page has screenshots of every screen, and you can ask me anything below."];
        else r = ["Love that! Here's the link."];
        r.push("Anything else you'd like to know? Ask me anything about our apps.");
        bot(r, function () { showInput(); downloads(); });
      });
    });
  }
  function askEmail() {
    opts.innerHTML = "";
    bot(["What's your email? Chris will only use it to reply or send app updates."], function () { showInput("you@example.com", "email"); });
  }

  // ---------- Input ----------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = (input.value || "").trim(); if (!text) return;
    input.value = "";
    say(text, true);
    if (mode === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) { bot(["Hmm, that doesn't look like an email. Try again?"]); return; }
      try { window.posthog.identify(text.toLowerCase(), { email: text.toLowerCase() }); } catch (e2) {}
      track("helper_email", { has_question: convo.length > 0 });
      bot(["Thanks! You're all set. Anything else?"], function () { showInput(); });
      return;
    }
    convo.push({ role: "user", content: text });
    track("helper_question", { question: text.slice(0, 500) });
    var t = say("...", false); t.classList.add("hh-typing");
    fetch("/api/helper", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: convo, page: path }) })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        var reply = (d && d.reply) || "";
        if (!reply) throw 0;
        t.classList.remove("hh-typing"); t.textContent = reply; scroll();
        convo.push({ role: "assistant", content: reply });
        track("helper_ai_reply", { question: text.slice(0, 500), reply: reply.slice(0, 1000) });
      })
      .catch(function () {
        t.classList.remove("hh-typing");
        t.textContent = "Good question! I've passed it to Chris. Leave your email and he'll get back to you.";
        convo.pop();
        track("helper_ai_unavailable");
        opts.innerHTML = ""; var e3 = document.createElement("button"); e3.type = "button"; e3.className = "hh-o"; e3.textContent = "Leave my email"; e3.onclick = askEmail; opts.appendChild(e3);
        scroll();
      });
  });

  // ---------- Open / close ----------
  function open() {
    if (tease) { tease.remove(); tease = null; }
    panel.classList.add("open");
    if (!started) start();
  }
  function close() { panel.classList.remove("open"); track("helper_closed"); }
  root.querySelector("#hh-fab").onclick = function () { panel.classList.contains("open") ? close() : open(); };
  root.querySelector(".hh-x").onclick = close;

  // Sit above sticky bottom bars (e.g. the homepage's "Get HealthyOne" bar).
  var raf = 0;
  function lift() {
    raf = 0;
    var off = 0, bars = document.querySelectorAll(".sticky-cta-bar,#stickyCta,[data-sticky-bottom]");
    for (var i = 0; i < bars.length; i++) {
      var r = bars[i].getBoundingClientRect(), cs = getComputedStyle(bars[i]);
      if (cs.display !== "none" && cs.visibility !== "hidden" && r.height > 0 && r.top < innerHeight && r.bottom >= innerHeight - 2) off = Math.max(off, innerHeight - r.top);
    }
    root.style.setProperty("--hh-off", off + "px");
  }
  function queue() { if (!raf) raf = requestAnimationFrame(lift); }
  addEventListener("scroll", queue, { passive: true }); addEventListener("resize", queue);
  setInterval(queue, 1500); queue();

  // One gentle nudge per visitor, after 15 seconds.
  setTimeout(function () {
    if (started || store("hh_tease")) return;
    store("hh_tease", "1");
    tease = document.createElement("div"); tease.id = "hh-tease";
    tease.innerHTML = "Got a sec? 3 quick questions <b>&times;</b>";
    tease.onclick = function (e) {
      if (e.target.tagName === "B") { tease.remove(); tease = null; track("helper_tease_dismissed"); return; }
      open();
    };
    root.insertBefore(tease, panel);
    track("helper_tease_shown");
  }, 15000);
})();
