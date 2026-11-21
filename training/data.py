"""Dataset loaders -> one table: text, label (1=scam), group (never split across folds), source, weight.

Every loader works on the text of what is SAID in a short window of the call (the last few turns),
because that is what the phone hears in real time.
"""
from __future__ import annotations
import csv, glob, hashlib, json, os, re
from typing import List
import pandas as pd

WINDOW_TURNS = 4  # model sees the last 4 spoken turns (~15-20 s of call)


_STRIP = re.compile(r"[0-9!-/:-@\[-`{-~\u0964\u0965\u201c\u201d\u2018\u2019\u2026\u20b9\u2013\u2014]+")


def clean(t: str) -> str:
    """Remove digits and punctuation so the model cannot learn dataset style ('..', ':)', '0800', 'press 1')
    instead of what is said. MUST match cleanText() in src/engine/model.ts."""
    return re.sub(r"\s+", " ", _STRIP.sub(" ", t.lower())).strip()


_norm = clean


# ---------------------------------------------------------------- ICFD-31k (GitHub sample or full local copy)
def load_icfd_local(src_dir: str) -> pd.DataFrame:
    """ICFD source_conversations/*/*.json. Label of each window = ICFD's own verdict_at_chunk (streaming label)."""
    rows = []
    for f in sorted(glob.glob(os.path.join(src_dir, "**", "*.json"), recursive=True)):
        d = json.load(open(f, encoding="utf-8"))
        if "transcript" not in d:
            continue
        sid = f"icfd-{d.get('session_id', os.path.basename(f))}"
        turns, chunks = d["transcript"], d.get("chunk_level_analysis") or []
        final = str(d.get("final_verdict", "NO")).upper().startswith("Y")
        for i, t in enumerate(turns):
            ts = t.get("timestamp_end", 0)
            verdict = None
            for c in chunks:
                if c.get("timestamp", 0) >= ts:
                    verdict = c.get("verdict_at_chunk")
                    break
            if verdict is None and chunks:
                verdict = chunks[-1].get("verdict_at_chunk")
            label = int(str(verdict if verdict is not None else ("YES" if final else "NO")).upper().startswith("Y"))
            text = _norm(" ".join(x["text"] for x in turns[max(0, i - WINDOW_TURNS + 1): i + 1]))
            rows.append(dict(text=text, label=label, group=sid, source="icfd", weight=1.0, t=ts, conv_label=int(final), turn=i))
    return pd.DataFrame(rows)


# ---------------------------------------------------------------- NCSU robocall transcripts (real FTC-flagged robocalls)
def load_robocalls(csv_path: str, max_calls: int = 1500) -> pd.DataFrame:
    """github.com/wspr-ncsu/robocall-audio-dataset metadata.csv. All are scam/illegal robocalls (positives only)."""
    csv.field_size_limit(10**9)
    rows, seen = [], set()
    for r in csv.DictReader(open(csv_path, encoding="utf-8")):
        if r["language"] != "en":
            continue
        sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", r["transcript"]) if len(s.strip()) > 3]
        for j in range(0, max(1, len(sents)), 2):
            text = _norm(" ".join(sents[j: j + 3]))
            key = hashlib.md5(re.sub(r"\W+", "", text.lower()).encode()).hexdigest()
            if len(text.split()) < 5 or key in seen:  # many robocalls are identical templates
                continue
            seen.add(key)
            rows.append(dict(text=text, label=1, group="robo-" + r["file_name"], source="robocall", weight=0.5))
        if len(rows) > max_calls * 3:
            break
    return pd.DataFrame(rows)


# ---------------------------------------------------------------- UCI SMS Spam Collection
def load_sms(tsv_path: str) -> pd.DataFrame:
    rows = []
    for i, line in enumerate(open(tsv_path, encoding="utf-8", errors="ignore")):
        parts = line.rstrip("\n").split("\t")
        if len(parts) != 2:
            continue
        a, b = parts
        label, text = (a, b) if a in ("ham", "spam") else (b, a)
        rows.append(dict(text=_norm(text), label=int(label == "spam"), group=f"sms-{i}", source="sms", weight=0.5))
    return pd.DataFrame(rows)


# ---------------------------------------------------------------- Hugging Face sets (need huggingface.co access; untested in the build sandbox)
def _first_text_col(df: pd.DataFrame) -> str:
    for c in ("text", "message", "sms", "content", "dialogue", "transcript", "body"):
        if c in df.columns:
            return c
    return next(c for c in df.columns if df[c].dtype == object)


def load_hf_all() -> List[pd.DataFrame]:
    out: List[pd.DataFrame] = []
    try:
        from datasets import load_dataset
    except Exception as e:  # pragma: no cover
        print("  [hf] `datasets` not installed:", e)
        return out

    def add(repo, fn):
        print(f"  [hf] fetching {repo} ...", flush=True)
        try:
            df = fn()
            print(f"  [hf] {repo}: {len(df)} rows", flush=True)
            out.append(df)
        except Exception as e:
            print(f"  [hf] SKIPPED {repo}: {type(e).__name__}: {str(e)[:200]}", flush=True)

    def ysangam():
        df = load_dataset("ysangam/Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset", split="train").to_pandas()
        df = df.drop_duplicates("text")  # the card shows heavy templating
        return pd.DataFrame(dict(text=df["text"].map(_norm), label=df["label"].astype(int), group="ys-" + df.index.astype(str), source="hf_indian_scam_calls", weight=0.3))

    def bolewara():
        from huggingface_hub import snapshot_download
        p = snapshot_download("bolewara/hinglish-scam-text-dataset", repo_type="dataset")
        rows = []
        for f in glob.glob(os.path.join(p, "**", "*.json"), recursive=True):
            rows += json.load(open(f, encoding="utf-8")).get("rows", [])
        df = pd.DataFrame(rows)
        return pd.DataFrame(dict(text=df["text"].map(_norm), label=df["label"].astype(int), group="bw-" + df.index.astype(str), source="hf_hinglish_text", weight=0.5))

    def spamshield():
        from huggingface_hub import snapshot_download
        p = snapshot_download("M-Arjun/SpamShield-Datasets", repo_type="dataset")
        df = pd.read_parquet(glob.glob(os.path.join(p, "**", "combined.parquet"), recursive=True)[0])
        lang = next(c for c in df.columns if c.lower() in ("language", "lang"))
        keep = df[lang].astype(str).str.lower().str.contains("hinglish|punjabi|^pa$|^hi$|marathi|^mr$")
        df = df[keep]
        tc = _first_text_col(df)
        return pd.DataFrame(dict(text=df[tc].map(_norm), label=df["label"].astype(int), group="ss-" + df.index.astype(str), source="hf_spamshield_indic", weight=0.5))

    def icfd_full():
        # The full set is ~1M rows with huge audio-analysis columns, so do NOT download it all: stream a random
        # sample of rows per split, reading only the columns we need.
        import time
        cache = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "datasets", "icfd_full_sample.parquet")
        if os.path.exists(cache):
            print("      using cached sample:", cache, flush=True)
            parts = [pd.read_parquet(cache)]
        else:
            PER_SPLIT = {"train": 4000, "validation": 1500, "test": 1500}
            SECONDS = {"train": 150, "validation": 60, "test": 60}   # time box per split; keep whatever arrived
            want = ["cumulative_text", "final_verdict", "session_id", "conversation_uid", "case_type"]
            parts = []
            for sp, n in PER_SPLIT.items():
                print(f"      streaming up to {n} rows (max {SECONDS[sp]}s) of the {sp} split ...", flush=True)
                try:
                    ds = load_dataset("rishia2220/icfd-31k", split=sp, streaming=True, columns=want)
                except TypeError:
                    ds = load_dataset("rishia2220/icfd-31k", split=sp, streaming=True).select_columns(want)
                ds = ds.shuffle(seed=0, buffer_size=800)
                rows, t0 = [], time.time()
                for i, r in enumerate(ds):
                    rows.append({k: r.get(k) for k in want})
                    if (i + 1) % 500 == 0:
                        print(f"      {sp}: {i + 1} rows", flush=True)
                    if i + 1 >= n or time.time() - t0 > SECONDS[sp]:
                        break
                print(f"      {sp}: kept {len(rows)} rows", flush=True)
                d = pd.DataFrame(rows)
                d["_split"] = sp
                parts.append(d)
            try:
                os.makedirs(os.path.dirname(cache), exist_ok=True)
                pd.concat(parts, ignore_index=True).to_parquet(cache)
            except Exception as e:
                print("      (could not cache sample:", e, ")", flush=True)
        ds = pd.concat(parts, ignore_index=True)
        print("      verdict values:", ds["final_verdict"].astype(str).value_counts().head(8).to_dict(), flush=True)
        v = ds["final_verdict"].astype(str).str.strip().str.lower()
        pos = v.str.match(r"^(y|yes|true|1|fraud|scam|fraudulent|malicious|spam)")
        neg = v.str.match(r"^(n|no|false|0|safe|legit|genuine|benign|normal|ham|not)")
        ds = ds[pos | neg].copy()
        ds["label"] = pos[ds.index].astype(int)
        gcol = "conversation_uid" if ds["conversation_uid"].notna().any() else "session_id"
        tail = lambda x: _norm(str(x)[-400:])
        return pd.DataFrame(dict(text=ds["cumulative_text"].map(tail), label=ds["label"].values,
                                 group="icfdfull-" + ds[gcol].astype(str), source="icfd_full", weight=1.0,
                                 split=ds["_split"], t=0.0))

    add("ysangam/Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset", ysangam)
    add("bolewara/hinglish-scam-text-dataset", bolewara)
    add("M-Arjun/SpamShield-Datasets (Hinglish/Punjabi/Marathi rows)", spamshield)
    add("rishia2220/icfd-31k (full)", icfd_full)
    return out
