# Training VoiceGuard on real datasets

> **Python version:** use 3.12 or 3.13. The Hugging Face `datasets` package needs `pyarrow`, which has no wheel for Python 3.14 yet (Windows: `winget install -e --id Python.Python.3.12`, then run the commands below as `py -3.12 ...`).

```bash
python -m pip install -r training/requirements.txt
npm run fetch-datasets                 # ICFD sample, NCSU robocalls, SMS (all on GitHub/UCI mirrors)
python training/train.py --hf         # + full ICFD-31k and the Hinglish / Punjabi sets from Hugging Face
npm run check-model                    # proves the phone-side TypeScript gives the same probabilities as scikit-learn
npm run eval                           # rules + trained model on the sample calls
```

`train.py` writes `src/model/model.json` (the app picks it up on the next build) and `training/report.json`.

## What the model is
TF-IDF over word-bounded character 2-5-grams, then logistic regression, scored on the last 4 spoken turns (about 15-20 s). Character n-grams survive Hinglish spelling and speech-to-text noise. Everything runs in plain TypeScript on the phone, offline.
The app only counts model probability **above a pivot calibrated on unseen genuine calls** (98th percentile of out-of-fold benign windows), so a model that is unsure cannot raise the alarm.

## What was actually trained here, and the honest result
The build sandbox could only reach GitHub, so Hugging Face, Kaggle, Zenodo, Mendeley and IEEE DataPort were unreachable. Usable real data there:

| Data | Rows used | Role |
|---|---|---|
| ICFD-31k GitHub sample | 240 windows from 20 calls (8 fraud) with ICFD's own streaming labels | the only in-domain data, and the test set (grouped CV: windows of one call never in train and test) |
| NCSU robocall transcripts | 1,335 windows, all scam | extra positives |
| UCI SMS Spam Collection | 5,574 | extra ham / spam |

Grouped 5-fold CV on unseen ICFD calls (`training/report.json`):

| Training data | AUC | Fraud caught | False alarms |
|---|---|---|---|
| ICFD sample only | 0.64 | 0/8 | 0/12 |
| + robocalls | 0.62 | 0/8 | 1/12 |
| + SMS | 0.70 | 4/8 | 4/12 |
| + everything | 0.66 | 7/8 | 9/12 |

**That is not good enough to ship**, so `src/model/model.json` is a disabled stub and the app runs on its rules until you train on the full data. The diagnosis is visible in the top features: the model learned *where text came from* (`£`, `txt`, `press`, and `i / me / my` for texting) instead of scam tactics. 20 calls is too few, and the robocall / SMS data come from different channels than the calls they are tested on. The same pipeline on 31,000 in-domain conversations is the fix; the ICFD authors report a fine-tuned RoBERTa at 99.6% on their static task, so the data can support a strong model.

## Not tested here
- `--hf` loaders (`data.py: load_hf_all`) could not reach Hugging Face. Column names for `rishia2220/icfd-31k` and `M-Arjun/SpamShield-Datasets` are inferred; if one errors, adjust the name at the top of its loader. Each loader fails soft and prints `SKIPPED`.
- The full-ICFD protocol (train on `train`, calibrate on `validation`, report on `test` and the unseen-fraud-type `cross_domain` split) was exercised only on a mock with the same code path.
- No public Hindi or Punjabi call data exists, so Devanagari/Gurmukhi coverage comes from the rule lexicon, not from the model.
