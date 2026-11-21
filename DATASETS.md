# Datasets for VoiceGuard

Everything below was found by searching in Nov 2026. "In repo" means the file is already used by `npm run eval`. The Hugging Face host was blocked from the build sandbox, so those sets are **listed but not downloaded**; `scripts/fetch_datasets.py` pulls them on a normal internet connection.

## A. Scam call / conversation data (best fit for this project)

| Dataset | What it is | Size | Language | Access / licence | Use in VoiceGuard |
|---|---|---|---|---|---|
| **ICFD-31k** (NIT Jalandhar, IJCAI-ECAI 2026) | Synthetic Indian phone-fraud conversations with a final verdict, 3-second streaming-chunk labels, entities and rationales. 10 fraud umbrellas (banking, e-commerce, emergency, government, healthcare, jobs, loan, lottery/travel, tech, utility) plus 5 unseen types (charity, crypto, investment, romance, tax) | 31,000+ conversations, 1,111,071 chunks | English + Hinglish | HF `rishia2220/icfd-31k`, code `github.com/SPELLAILab/ICFD-31k`. Code MIT; **data for defensive research only, commercial deployment needs the authors' written permission** | **In repo (20-call sample, `datasets/icfd/examples`)**: used to measure fraud catch rate, false alarms and seconds-to-alert. Full set is the training source for a future on-device classifier |
| **Indian Cyber Scam PhoneCall Hinglish** | Scam vs non-scam call lines with `scam_category` (bank_kyc, aadhaar, lottery, police_blackmail, police_digital_arrest…), `caller_type`, `urgency_level`, `contains_blackmail` | ~10k rows | Hinglish | HF `ysangam/Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset`, Apache-2.0. Preview rows are very templated, so treat as lexicon-seeding data, not proof of accuracy | Seed more Hinglish phrases for the lexicon |
| **Hinglish & English Financial Scam Text** | Scam / benign messages incl. hand-written Hinglish KYC, UPI, lottery, loan, OTP, PAN, electricity scams | 3,787 | English + Hinglish | HF `bolewara/hinglish-scam-text-dataset`, CC BY 4.0 | Extra Hinglish negatives and positives |
| **Spam SMS in Hindi** (NIT Silchar) | Spam/ham Hindi messages collected from students | 3,894 | Hindi | IEEE DataPort, DOI 10.21227/5y8x-n678 (free account) | Hindi lexicon / false-alarm test |
| **Spam SMS in Dravidian languages** | Spam/ham in English, Tamil, Telugu, Kannada, Malayalam | ~7,700 | South-Indian | IEEE DataPort, DOI 10.21227/dcym-pd69 | Future language expansion |
| **SMS Spam Collection** (UCI) | Classic English SMS ham/spam | 5,574 (4,827 ham / 747 spam) | English | UCI, CC BY 4.0. **In repo (`datasets/sms/sms.tsv`)** | False-alarm stress test (0.0% red alerts on ham) |
| **SMS Phishing (Smishing) dataset** (Mendeley) | Ham, spam and smishing labels with URL/email attributes | 5,971 (489 spam, 638 smishing, 4,844 ham) | English | Mendeley Data, DOI 10.17632/f45bkkt8pr.1 | Link / smishing cues |
| **Real phone-scam recordings + transcripts** (NSF PAR 10271601) | Recorded social-engineering scam calls from a user study | see paper | English | Linked from the paper page | Real-speech realism check |
| **Scam-baiting call transcripts** (arXiv 2307.01965) | 341 annotated transcripts, ~90 h, from YouTube scam baiters, with scam stages | 341 | English | Ask the authors / see paper | Learn scam stage order (hook → pretext → pressure → payment) |
| **Conversational smishing, "COVA"** (arXiv 2604.11752) | Synthetic multi-turn scam chats, 8 categories | 3,201 conversations | English | See paper | Multi-turn training data |
| **ConScamBench-278 / LoveFraud02** (arXiv 2607.11707) | Multi-turn scam benchmark; romance-fraud corpus | 278 / n/a | English | See paper | Covers the slow "wrong number" romance cons our rules miss |
| **TeleAntiFraud-28k** (arXiv 2503.24115) | Audio-text telecom-fraud pairs with reasoning annotations | 28,511 | Chinese | Released by authors | Method reference for audio + text detection |
| **KorCCViD / KorCCVi v2** | Korean voice-phishing transcripts | ~1.2k+ | Korean | IEEE DataPort node 14055 | Cross-lingual vishing reference |
| **Smishing + vishing large-scale set** (NAACL Industry 2025) | 94,602 phishing samples, text + voice | 94,602 | Korean | On request | Reference only |
| **Voice-phishing benchmark** (LREC 2026) | Evaluation benchmark for vishing detectors | n/a | Korean | See paper | Benchmark design reference |

| **NCSU robocall audio dataset** | Real FTC-flagged robocalls with Whisper transcripts and the case letters | 1,432 (1,378 English, 54 Chinese) | English | `github.com/wspr-ncsu/robocall-audio-dataset`, `metadata.csv`. **Used for training** (positives only) | Extra real scam wording; also shown to cause source leakage, see training/README.md |
| **SpamShield** | 149,359 messages in 23 languages incl. Hinglish, Punjabi, Marathi; categories phishing, scam, job_scam… | 149,359 | Hinglish, Punjabi… | HF `M-Arjun/SpamShield-Datasets`, CC-BY-4.0. Loader written, not run | Best source of Punjabi / Hinglish text once you have Hugging Face access |

## B. Indian speech data (for better Hindi / Punjabi recognition)

| Dataset | Size | Notes |
|---|---|---|
| **IndicVoices** (AI4Bharat / IIT Madras) | 7,348 h, 22 languages, 16,237 speakers, 145 districts; read, extempore and conversational | Best for natural Hindi and Punjabi speech; basis for IndicASR. `ai4bharat.iitm.ac.in/indicvoices` |
| **IndicVoices-R** | 1,704 h, 22 languages | Clean TTS-grade audio, useful for generating test calls |
| **IndicSUPERB** | Includes Hindi and Punjabi | ASR benchmark for Indian languages |
| **Mozilla Common Voice** (Hindi, Punjabi) | crowd-sourced | Free; a Punjabi ASR benchmark is also listed on India's AIKosh |

## C. Context numbers for the pitch (not training data)

Press reports of MHA / I4C figures, which vary a little by outlet, so quote the source with the number:
- Indians lost about ₹22,495 crore to cybercrime in 2025, a 24% rise, mostly investment scams (ThePrint).
- "Digital arrest" scams cost ₹1,918–1,935 crore in 2024 (ThePrint, Inc42 citing the MHA).
- The 1930 helpline logged about 32.4 million calls in 2025 (Moneylife).
- Investment fraud is ~77% of reported losses and digital arrest ~8% (CyberPeace / Indian Express reporting).

## D. What actually trained the model here
Only data reachable from GitHub: ICFD-31k sample (20 calls), NCSU robocalls, UCI SMS. Hugging Face, Kaggle, Zenodo, Mendeley and IEEE DataPort were blocked, so every set marked HF or DataPort above is **listed, not used**. See `training/README.md` for the result and why the model is shipped disabled.

## E. Honest notes
- No public dataset has **real recorded Indian scam calls in Hindi or Punjabi**. ICFD-31k and the Hinglish sets are synthetic or templated. Before claiming accuracy, test on a small set of consented, real recordings.
- The 20-call ICFD sample is far too small for accuracy claims. Run the full set with `scripts/fetch_datasets.py` and extend `scripts/evaluate.ts`.
- One ICFD sample labelled "fraud" is actually a bank agent warning a victim about a cheque scam, so a perfect score there is not even the goal.
