// Vercel serverless function: AI answers for the site helper bubble.
// Needs ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables.
// Without it, returns 503 and the widget falls back to its scripted reply.

const MODEL = process.env.HELPER_MODEL || "claude-haiku-4-5";
const MAX_TURNS = 10;          // messages kept from the conversation
const MAX_CHARS = 600;         // per visitor message
const RATE = { windowMs: 10 * 60 * 1000, max: 20 }; // per IP, best effort
const hits = new Map();

const SYSTEM = `You are the website helper for Hardaway Labs (healthyoneapp.com), a small app studio founded by Chris Hardaway. You are an AI assistant, not Chris. If someone asks, say you're an AI helper and that Chris reads the questions people leave here.

Answer questions about the apps briefly and warmly: 1 to 3 short sentences, plain text, no markdown, no lists, no em dashes. Only state facts listed below. If you don't know (for example a price that isn't listed, release dates, account or billing problems), say so and suggest emailing chris@hardawaylabs.com. Never give medical, legal or financial advice; for GLP-1 or health questions, share what the app does and suggest talking with their doctor. Don't discuss topics unrelated to these apps beyond a polite one-line redirect.

APPS
- HealthyOne (iPhone and Android): AI nutrition tracker built around "never restart your health again", a get-back-on-track system instead of streak punishment. Log meals by photo, voice, text or barcode; AI estimates 50+ nutrients. Built for people on GLP-1 medications (Ozempic, Wegovy, Mounjaro, Zepbound): protein-first dashboard, side-effect tracking tied to meals, dose logging, micronutrient gap alerts. Also heart-health dashboard, intermittent fasting tracker, recipes, grocery lists, Apple Health / Health Connect sync. HealthyOne Plus is $7.99/month or $59.99/year with a 7-day free trial. It is a tracking and education tool, not a medical device.
- Healthy Faith (iPhone and Android): Bible study app. Record a sermon live or paste a YouTube link and get a summary, key verses and takeaways. King James Bible with Strong's Hebrew and Greek on any word, a daily Today page, reading challenges and circles to follow a plan with friends. Reading, challenges and circles are always free with no account. Premium ($3.99/month or $29.99/year, 7-day free trial) adds audio listening with natural AI voices, Ask, and sermon notes.
- Faith Daily Bible: the whole Bible free, no ads, no account. NIV, NLT, NKJV, BSB, KJV, RVR 1909, a verse for today and a chapter a day. On Android now; iPhone coming soon. Hands off to Healthy Faith for word study, sermon notes and audio.
- Recipella (iPhone and Android): paste a TikTok recipe, get a clean recipe card and grocery list. Free to start.
- Budget Shield (iPhone): one safe-to-spend number before payday; texts you before a bill bounces.
- Healthy Relationships (iPhone): "Respond, don't react." Tap when tension rises.
- Healthy Bump (iPhone): pregnancy nutrition made simple, 15 nutrients scored daily.
All apps are at healthyoneapp.com/apps. Contact: chris@hardawaylabs.com.`;

function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > RATE.max;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const origin = req.headers.origin || "";
  if (origin && !/^https:\/\/(www\.)?healthyoneapp\.com$|\.vercel\.app$|^http:\/\/localhost/.test(origin)) {
    return res.status(403).json({ error: "forbidden" });
  }
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "x";
  if (limited(ip)) return res.status(429).json({ error: "slow down" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: "ai_off" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const page = String((body && body.page) || "").slice(0, 120);
  const raw = Array.isArray(body && body.messages) ? body.messages : [];
  const messages = raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "no question" });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: SYSTEM + (page ? `\n\nThe visitor is on ${page}.` : ""),
        messages,
      }),
    });
    if (!r.ok) return res.status(502).json({ error: "upstream", status: r.status });
    const data = await r.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    return res.status(200).json({ reply: text.replace(/—/g, ", ") });
  } catch (e) {
    return res.status(502).json({ error: "upstream" });
  }
};
