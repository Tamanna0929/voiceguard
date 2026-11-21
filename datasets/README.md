# VoiceGuard datasets (local files)

All files are JSONL, one `{"text","label"}` per line (label 1 = scam, 0 = normal). `.jsonl` files are git-ignored except where noted.

## Call data
| File | Source | Language | Notes |
|---|---|---|---|
| `voiceguard-handwritten-calls.jsonl` | Written by our team (`handwritten/build.py`) | Hindi (Devanagari), Punjabi (Gurmukhi), Hinglish | 36 scam + 21 normal short call scripts. Original text, not scraped, not machine-translated. Add your own to `build.py`; a native-speaker review is recommended. |
| `robocall/` | github.com/wspr-ncsu/robocall-audio-dataset | English (US) | Real recordings + transcripts. |
| `icfd/` | ICFD-31k (IJCAI 2026) | Indian English / Hinglish | Synthetic transcripts. |
| `npm run get:data` | Hugging Face call sets | Hinglish / English | Downloads more call datasets. |

## Message data (secondary: SMS, not calls)
| File | Source | Language |
|---|---|---|
| `gh__SubhanshuWalia__hindi-sms.jsonl` | github.com/SubhanshuWalia/Spam_Ham | Hindi |
| `gh__vanshbeni__sms-suraksha-hindi.jsonl` | github.com/vanshbeni/SMS-Suraksha | Hindi (machine-translated) |
| `gh__vanshbeni__sms-suraksha-punjabi.jsonl` | same | Punjabi (machine-translated, noisy) |
| `gh__princebari__hinglish-sms.jsonl` | github.com/princebari/SMS-Spam-Classification-on-Indian-Dataset | Hinglish |

Real Hindi/Punjabi scam *call recordings* are not publicly released anywhere (privacy/legal limits), so Hindi/Punjabi call coverage comes from the hand-written scripts plus the Hinglish call sets.

Evaluate: `npm run eval:data -- --local` (these files) or `npm run eval:data` (call sets).
