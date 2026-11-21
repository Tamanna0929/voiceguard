# 🛡️ VoiceGuard

Real-time scam-call guard for India. Listens to a conversation (speakerphone), shows a live transcript, tags scam tactics, drives a 0–100 risk meter and shows a full-screen **HANG UP** alert with next steps (1930, cybercrime.gov.in), and can ping a trusted contact. English, Hindi and Punjabi (incl. Hinglish). One Expo / React Native codebase for **iOS and Android**.

It covers three moments: **during** the call (detect and alert), **at once** if someone already shared something (a personalised emergency plan), and **afterwards** (an incident tracker for complaints and evidence), with privacy controls throughout.

## Run it

Needs a **development build** (live speech-to-text is a native module, so Expo Go will not work).

```bash
npm install
# Android (Android Studio + a phone/emulator)
npx expo run:android
# iOS (Mac with Xcode)
npx expo run:ios
# No Mac / no Android Studio? Cloud builds:
npm i -g eas-cli && eas login
eas build --profile development --platform android     # or ios (needs Apple developer account)
npm start                                              # then open the dev build
```

Try it without a real call: **Try a demo call** / **Awareness mode** replay scripted scams (tick *Speak the call aloud* to play it through the speaker and test the real microphone path).

## Privacy, recovery and incidents

| Feature | What it does | Code |
|---|---|---|
| **Sensitive-data masking** | OTPs, PINs/CVV, card, Aadhaar, phone, account numbers, UPI IDs, e-mail, PAN and IFSC are hidden *before* a sentence reaches the transcript, the risk engine, history or the optional AI proxy. Amounts and 1930/1800 numbers are kept. Spoken digits ("four eight two…") are masked too. | `src/privacy/mask.ts` |
| **Privacy dashboard** | Plain-language account of what is stored and sent (audio: never; transcripts: memory only), live counters of items hidden and sentences sent to your proxy, switches for masking / on-device speech / cloud AI / history, **export my data** and **delete all my data**. It also says honestly when speech recognition uses Google or Apple's service. | `src/screens/PrivacyScreen.tsx`, `src/services/privacy.ts` |
| **"I think I've been scammed"** | Pick what happened (sent money, shared OTP, card/PIN, installed an app, shared Aadhaar/PAN, opened a link, threatened). It builds an ordered plan (do now / within the hour / today / this week) with one-tap actions: call 1930, open cybercrime.gov.in, call your bank, lock Aadhaar biometrics, check SIMs on your ID (TAFCOP), report the number (Chakshu). Also reachable from the red alert ("I already shared something"). | `src/recovery/guide.ts`, `src/screens/RecoveryScreen.tsx` |
| **Check a message** | Paste a suspicious SMS or WhatsApp text: scored by the same on-device engine, shown with sensitive numbers hidden, links flagged (shortened links, .apk installs, odd endings, bare IPs). The pasted text is dropped as soon as it is checked and nothing is stored. | `src/engine/messageCheck.ts`, `src/screens/CheckScreen.tsx` |
| **Temporary audio, auto-delete** | Speech is recognised with `recordingOptions: { persist: false }`, so audio is never written to a file. Session summaries delete themselves after 7 / 30 / 90 days (your choice). | `src/services/speech.ts`, `src/services/storage.ts` |
| **Incident tracker** | Every plan is saved as an incident: tick-off steps, transactions (amount, time, UTR, receiver), suspect numbers/UPI IDs/links, evidence checklist, reference numbers (1930, portal acknowledgement, bank, FIR), notes, timeline, and **Share summary** (plain text for the portal, bank or police). Stored on the phone only. | `src/services/incidents.ts`, `src/screens/IncidentsScreen.tsx` |

Sources for the recovery steps: 1930 / cybercrime.gov.in (MHA), RBI circular on limiting customer liability in unauthorised electronic transactions (July 2017), UIDAI biometric lock, DoT Sanchar Saathi (Chakshu, TAFCOP). The app never sends a message or files a complaint for the user: it opens the official channel and records what the user entered. Hindi and Punjabi text should be reviewed by a native speaker before release.

`npm test` runs the masking, no-regression and recovery-plan tests.

## How it works

```
mic → OS speech-to-text (hi-IN / pa-IN / en-IN, interim + final)
    → on-device rule engine (src/engine): multilingual tactic lexicon, advice-guard ("never share your OTP" ≠ request)
    → trained model (src/engine/model.ts, learned from the datasets by training/train.py) scores the last 4 turns
    → [optional] AI second opinion via your proxy (server/proxy.js) merged in when it returns (<2.5 s, else ignored)
    → noisy-OR risk score + combo boosts, fast-up / slow-down smoothing → meter, transcript highlights, alert
```

- **13 tactics**: urgency, authority, OTP, card/PIN/password, secrecy, payment, threat, remote-access/link, lure (prize/job/investment/loan), account/KYC/parcel pretext, isolation ("digital arrest"), Aadhaar/PAN, family-emergency story.
- **Scoring**: each tactic has a base weight (an OTP request ≈ 0.55, mild urgency ≈ 0.2). They combine as `1 − Π(1 − p)`, plus boosts for dangerous pairs (authority + threat, OTP + urgency, secrecy + payment…). Quiet sentences decay evidence ×0.9. Red alert at ≥ 70, amber at ≥ 35.
- **Works offline** and instantly. The cloud AI is opt-in, text only (never audio), and goes through *your* server so no API key is in the app.
- **Privacy**: no audio saved, no transcript saved; history keeps only time, peak risk and flag types.

## Learning from the datasets (read this)

`training/train.py` trains a classifier on the datasets and exports it into the app. **The shipped `src/model/model.json` is a disabled stub**: from the build sandbox only ~20 labelled Indian calls were reachable (Hugging Face was blocked), and a model trained on that learned data-source style, not scam tactics (grouped-CV AUC 0.62-0.70). Until you run `python training/train.py --hf` on a machine with internet, the detector is the hand-written multilingual rules. Details and the numbers: [training/README.md](training/README.md).

## Check the engine

```bash
npm run typecheck
npm run fetch-datasets     # SMS data + ICFD-31k sample (see DATASETS.md)
npm run eval
```

Current results (small samples, so indicative only):

| Test | Result |
|---|---|
| 7 scripted scam calls (En/Hinglish/Hindi/Punjabi) + 2 genuine | 9/9 correct (scripts were written alongside the lexicon, so this is a regression test, not accuracy) |
| ICFD-31k sample, 20 calls | **6/8 fraud caught, 0/12 false alarms**, median 49 s to alert. Misses: a mislabelled bank-warning call and a slow romance "wrong number" con |
| UCI SMS ham, 4,827 messages | 0.0% red alerts, 0.3% amber |

## Optional AI proxy

```bash
ANTHROPIC_API_KEY=... npm run proxy     # listens on :8787, model via VG_MODEL (default claude-haiku-5-5)
```
Deploy it anywhere with HTTPS, then paste the URL in **Settings → Cloud AI**.

## Limits you should state honestly

- Masking is pattern-based. It will miss digits that speech-to-text writes as words in an unexpected way, and it can hide a harmless long number. It reduces exposure; it is not a guarantee.
- The recovery plan is guidance, not legal or financial advice. Recovery of money depends on how fast 1930 and the bank are reached.
- Bank helpline numbers are not bundled (they change and a wrong one is dangerous): the user saves the number from their card or bank app.
- iOS and Android **do not let apps record or hear phone calls**. The prototype listens through the microphone with speakerphone on. A production Android route would be a carrier / dialer partnership or the OS vendor's own call-screening hooks.
- Speech-to-text errors on noise, accents and code-mixing can cause misses or false flags. Punjabi recognition depends on the phone's speech service.
- A genuine delivery or bank agent who really asks you to read out an OTP will look suspicious. That is intentional: it is a red flag either way.
- "Alert family" opens a pre-filled SMS / WhatsApp message for one tap to send; mobile OSes do not allow silent sending.
- Consent: if you listen to another person's voice, tell them (the caller is on your speaker). Check local recording and consent law before any real-world pilot.
- ICFD-31k data may not be used commercially without the authors' permission.

## Roadmap
1. Train a small on-device classifier (MuRIL / IndicBERT → TFLite/Core ML) on ICFD chunk labels plus real consented data; keep the rules as a safety net.
2. On-device Indic ASR (AI4Bharat IndicConformer) for offline Hindi/Punjabi.
3. More languages (Tamil, Telugu, Bengali…), caller-number reputation, and a one-tap "report to 1930" form.
