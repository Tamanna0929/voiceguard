// Optional AI second-opinion proxy. Your API key stays on this server, never in the app.
//   GEMINI_API_KEY=...    node server/proxy.js     (uses Gemini)
//   ANTHROPIC_API_KEY=... node server/proxy.js     (uses Claude)
// Node 18+, no dependencies.
// POST /classify  { sentence, context: string[], lang }  ->  { tactics: TacticId[], reason }
//
// Privacy by design: the app already hides OTPs, card, phone, Aadhaar and other numbers BEFORE it calls this proxy.
// This proxy redacts again as a second layer, caps the request size, never logs request text, asks Gemini not to
// store the request (store:false), and rate-limits each client.
const http = require('node:http');

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
const PROVIDER = GEMINI_KEY ? 'gemini' : 'anthropic';
const MODEL = process.env.VG_MODEL || (PROVIDER === 'gemini' ? 'gemini-3.6-flash' : 'claude-haiku-5-5');
const PORT = Number(process.env.PORT || 8787);
const MAX_BODY = 4000; // bytes; a masked sentence plus a few lines of context is far smaller
const RATE_PER_MIN = Number(process.env.VG_RATE || 40);
const TACTICS = ['URGENCY', 'AUTHORITY', 'OTP', 'CREDENTIALS', 'SECRECY', 'PAYMENT', 'THREAT', 'REMOTE_ACCESS', 'LURE', 'ACCOUNT_PRETEXT', 'ISOLATION', 'PERSONAL_ID', 'EMERGENCY'];

const SYSTEM = `You are the second-opinion engine of VoiceGuard, an app that warns people in India during scam phone calls.
You receive the latest spoken sentence (English, Hindi, Punjabi or Hinglish; speech-to-text may be noisy) and a few earlier sentences.
Numbers such as OTPs, cards and phone numbers were hidden on the phone and appear as bullets or tags like [phone no.]; ignore them.
Return ONLY JSON: {"tactics":[...],"reason":"<max 15 words>"} where tactics is a subset of:
${TACTICS.join(', ')}.
Tag a tactic only if the LATEST sentence itself shows it, using earlier sentences just for context. Definitions:
URGENCY pressure to act now; AUTHORITY claims to be police/CBI/bank/courier/government; OTP asks for an OTP/verification code;
CREDENTIALS asks for card number, CVV, PIN, password or login details; SECRECY says not to tell anyone; PAYMENT asks to transfer/pay money, fees, gift cards, "safe account", or borrows money;
THREAT arrest, legal action, account/SIM/power cut-off; REMOTE_ACCESS asks to install an app, share screen or click a link; LURE prize, job, loan or investment too good to be true;
ACCOUNT_PRETEXT KYC/parcel/bill/suspicious-activity story; ISOLATION keeps you on the call or "digital arrest"; PERSONAL_ID asks for Aadhaar/PAN/ID; EMERGENCY a relative in accident/arrest/hospital or "new number" story.
Genuine bank warnings such as "never share your OTP" must return an empty list. Romance or wrong-number cons that slowly build trust and then ask for money: tag PAYMENT when money is requested. When unsure return {"tactics":[]}.`;

/** Second line of defence: even if a client forgot to mask, digits and handles never reach the model. */
function redact(s) {
  return String(s)
    .slice(0, 600)
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*/g, '[id]')
    .replace(/\+?\d(?:[ -]?\d){3,}/g, (m) => (/^(?:₹|rs)/i.test(m) ? m : '[num]'));
}

async function callGemini(userText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 600 },
    store: false, // ask Google not to keep this request (paid projects store by default)
  };
  const send = (b) => fetch(url, { method: 'POST', headers: { 'x-goog-api-key': GEMINI_KEY, 'content-type': 'application/json' }, body: JSON.stringify(b) });
  let res = await send(body);
  if (res.status === 400) {
    // an older model or API surface may not know "store": retry once without it
    delete body.store;
    res = await send(body);
  }
  if (!res.ok) throw new Error('Gemini HTTP ' + res.status);
  const data = await res.json();
  return ((data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || []).map((p) => p.text || '').join('');
}

async function callClaude(userText) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': CLAUDE_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 120, system: SYSTEM, messages: [{ role: 'user', content: userText }] }),
  });
  if (!res.ok) throw new Error('Anthropic HTTP ' + res.status);
  const data = await res.json();
  return (data.content || []).map((b) => b.text || '').join('');
}

async function classify({ sentence, context = [], lang = 'en' }) {
  const userText = `Earlier:\n${context.slice(-6).map(redact).join('\n') || '(none)'}\n\nLatest (${String(lang).slice(0, 8)}): ${redact(sentence)}`;
  const text = PROVIDER === 'gemini' ? await callGemini(userText) : await callClaude(userText);
  const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  return { tactics: (json.tactics || []).filter((t) => TACTICS.includes(t)), reason: String(json.reason || '').slice(0, 120) };
}

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > RATE_PER_MIN;
}

http
  .createServer((req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'content-type');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();
    if (req.method === 'GET' && req.url === '/health') return res.writeHead(200).end(`ok ${PROVIDER} ${MODEL}`);
    if (req.method !== 'POST' || req.url !== '/classify') return res.writeHead(404).end();
    if (limited(req.socket.remoteAddress || 'x')) return res.writeHead(429).end();
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > MAX_BODY) req.destroy();
    });
    req.on('end', async () => {
      try {
        if (!GEMINI_KEY && !CLAUDE_KEY) throw new Error('Set GEMINI_API_KEY or ANTHROPIC_API_KEY');
        const out = await classify(JSON.parse(body));
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out));
      } catch (e) {
        // never echo or log the request text
        res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: String(e.message || e).slice(0, 120) }));
      }
    });
  })
  .listen(PORT, () => console.log(`VoiceGuard AI proxy on :${PORT} (${PROVIDER}, model ${MODEL})`));
