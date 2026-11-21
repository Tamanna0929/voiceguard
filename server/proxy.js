// Optional AI second-opinion proxy. Keeps your API key on the server, never in the app.
//   ANTHROPIC_API_KEY=sk-... node server/proxy.js      (Node 18+, no dependencies)
// POST /classify  { sentence, context: string[], lang }  ->  { tactics: TacticId[], reason }
const http = require('node:http');

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.VG_MODEL || 'claude-haiku-5-5';
const PORT = Number(process.env.PORT || 8787);
const TACTICS = ['URGENCY', 'AUTHORITY', 'OTP', 'CREDENTIALS', 'SECRECY', 'PAYMENT', 'THREAT', 'REMOTE_ACCESS', 'LURE', 'ACCOUNT_PRETEXT', 'ISOLATION', 'PERSONAL_ID', 'EMERGENCY'];

const SYSTEM = `You are the second-opinion engine of VoiceGuard, an app that warns people in India during scam phone calls.
You receive the latest spoken sentence (English, Hindi, Punjabi or Hinglish; speech-to-text may be noisy) and a few earlier sentences.
Return ONLY JSON: {"tactics":[...],"reason":"<max 15 words>"} where tactics is a subset of:
${TACTICS.join(', ')}.
Tag a tactic only if the LATEST sentence itself shows it, using earlier sentences just for context. Definitions:
URGENCY pressure to act now; AUTHORITY claims to be police/CBI/bank/courier/government; OTP asks for an OTP/verification code;
CREDENTIALS asks for card number, CVV, PIN, password or login details; SECRECY says not to tell anyone; PAYMENT asks to transfer/pay money, fees, gift cards, "safe account", or borrows money;
THREAT arrest, legal action, account/SIM/power cut-off; REMOTE_ACCESS asks to install an app, share screen or click a link; LURE prize, job, loan or investment too good to be true;
ACCOUNT_PRETEXT KYC/parcel/bill/suspicious-activity story; ISOLATION keeps you on the call or "digital arrest"; PERSONAL_ID asks for Aadhaar/PAN/ID; EMERGENCY a relative in accident/arrest/hospital or "new number" story.
Genuine bank warnings such as "never share your OTP" must return an empty list. Romance or wrong-number cons that slowly build trust and then ask for money: tag PAYMENT when money is requested. When unsure return {"tactics":[]}.`;

async function classify({ sentence, context = [], lang = 'en' }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 120,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Earlier:\n${context.join('\n') || '(none)'}\n\nLatest (${lang}): ${sentence}` }],
    }),
  });
  if (!res.ok) throw new Error('Anthropic HTTP ' + res.status);
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || '').join('');
  const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  return { tactics: (json.tactics || []).filter((t) => TACTICS.includes(t)), reason: String(json.reason || '').slice(0, 120) };
}

http
  .createServer(async (req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'content-type');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();
    if (req.method === 'GET' && req.url === '/health') return res.writeHead(200).end('ok');
    if (req.method !== 'POST' || req.url !== '/classify') return res.writeHead(404).end();
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        if (!KEY) throw new Error('ANTHROPIC_API_KEY not set');
        const out = await classify(JSON.parse(body));
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: String(e.message || e) }));
      }
    });
  })
  .listen(PORT, () => console.log(`VoiceGuard AI proxy on :${PORT} (model ${MODEL})`));
