# VoiceGuard rule engine on public datasets

Sample: up to 300 rows per dataset, spread across the split. Alert = risk >= 70; caution = risk >= 35. No model training: this is the on-device rule engine as shipped.

| Dataset | What it is | Scam rows | Normal rows | Scams alerted | Scams alerted or cautioned | Normal falsely alerted | Normal falsely alerted or cautioned |
|---|---|---|---|---|---|---|---|
| gh__princebari__hinglish-sms | local file | 138 | 162 | 0.0% | 3.6% | 0.0% | 0.6% |
| gh__SubhanshuWalia__hindi-sms | local file | 99 | 201 | 0.0% | 16.2% | 0.0% | 1.5% |
| gh__vanshbeni__sms-suraksha-hindi | local file | 21 | 279 | 0.0% | 0.0% | 0.0% | 0.0% |
| gh__vanshbeni__sms-suraksha-punjabi | local file | 32 | 268 | 0.0% | 3.1% | 0.0% | 0.0% |
| kaggle__scam-nonscam-calls-english | local file | 197 | 103 | 25.4% | 50.8% | 1.0% | 1.0% |
| voiceguard-handwritten-calls | local file | 36 | 21 | 75.0% | 100.0% | 0.0% | 0.0% |
| **All datasets** | | 523 | 1034 | 14.7% | 30.2% | 0.1% | 0.5% |

## By script of the text

| Script | Scam rows | Normal rows | Scams alerted | Scams alerted or cautioned | Normal falsely alerted |
|---|---|---|---|---|---|
| Roman or English | 359 | 314 | 16.4% | 32.6% | 0.3% |
| Hindi | 132 | 486 | 7.6% | 21.2% | 0.0% |
| Punjabi | 32 | 234 | 25.0% | 40.6% | 0.0% |



Notes: many "spam" rows in SMS sets are promotions, not scams, so recall there understates scam detection and caution flags on them are not all false alarms. Several sets are synthetic or machine-translated.