#!/usr/bin/env python3
"""Download the WHOLE Hugging Face scam datasets (all files, not the 100-row preview API) into datasets/hf_full/.

  pip install huggingface_hub pandas pyarrow
  python scripts/download_hf_full.py              # all datasets below
  python scripts/download_hf_full.py org/name     # just one

Needs internet (and, for gated sets, `huggingface-cli login` after accepting the terms on the dataset page).
datasets/hf_*/ is in .gitignore, so these big files are never pushed to GitHub.
"""
import os, sys
from huggingface_hub import snapshot_download

REPOS = [
    "rishia2220/icfd-31k",
    "ysangam/Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset",
    "BothBosu/scam-dialogue",
    "BothBosu/single-agent-scam-conversations",
    "BothBosu/multi-agent-scam-conversation",
    "BothBosu/youtube-scam-conversations",
    "436-4/youtube-scam-conversations",
    "CloveAI/india-spam-sms",
    "bolewara/hinglish-scam-text-dataset",
    "ashu0311/SMS_Spam_Multilingual_Collection_Dataset",
    "Atlas-AI-Labs/GCT-100K",
    "M-Arjun/SpamShield-Datasets",
]
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "datasets", "hf_full")
repos = sys.argv[1:] or REPOS
os.makedirs(OUT, exist_ok=True)
ok, bad = [], []
for r in repos:
    dest = os.path.join(OUT, r.replace("/", "__"))
    print(f"\n== {r}")
    try:
        snapshot_download(repo_id=r, repo_type="dataset", local_dir=dest,
                          allow_patterns=["*.parquet", "*.csv", "*.tsv", "*.json", "*.jsonl", "*.md"])
        n = sum(os.path.getsize(os.path.join(a, f)) for a, _, fs in os.walk(dest) for f in fs)
        print(f"   saved {n/1e6:.1f} MB -> {dest}")
        ok.append(r)
    except Exception as e:
        print("   SKIPPED:", str(e)[:200])
        bad.append(r)
print(f"\nDone. {len(ok)} downloaded, {len(bad)} skipped: {bad}")
print("Next: python training/train_multi.py --hf-dir datasets/hf_full")
