"""Loader for whole Hugging Face datasets downloaded by scripts/download_hf_full.py (parquet / csv / tsv / json / jsonl).
Auto-detects the text and label columns, so any scam dataset dropped into datasets/hf_full/<name>/ is picked up."""
from __future__ import annotations
import glob, os, re
import numpy as np, pandas as pd
from data import clean

TEXT_COLS = ["cumulative_text", "text", "Text", "message", "Message", "sms", "SMS", "dialogue", "conversation", "transcript",
             "text_transcript", "content", "body", "sentence"]
LABEL_COLS = ["final_verdict", "label", "labels", "Label", "LABEL", "class", "Class", "is_scam", "scam", "spam", "is_spam", "verdict", "category", "Category", "type"]
POS = re.compile(r"^(y|yes|true|1|fraud|scam|fraudulent|malicious|spam|smish|smishing|phish|phishing)")
NEG = re.compile(r"^(n|no|false|0|safe|legit|legitimate|genuine|benign|normal|ham|not|non|none)")
CALL_HINT = re.compile(r"icfd|scam-?dialogue|conversation|phonecall|call|youtube", re.I)
MAX_ROWS = 20000


def to_label(v):
    if isinstance(v, (bool, np.bool_)):
        return int(v)
    if isinstance(v, (int, float, np.integer, np.floating)):
        return int(v) if v in (0, 1) else None
    s = str(v).strip().lower()
    if NEG.match(s):
        return 0
    if POS.match(s):
        return 1
    return None


def read_any(path: str, cols=None) -> pd.DataFrame:
    p = path.lower()
    if p.endswith(".parquet"):
        return pd.read_parquet(path, columns=cols)
    if p.endswith(".csv"):
        return pd.read_csv(path, usecols=cols, on_bad_lines="skip", engine="python")
    if p.endswith(".tsv"):
        return pd.read_csv(path, sep="\t", usecols=cols, on_bad_lines="skip", engine="python")
    return pd.read_json(path, lines=p.endswith(".jsonl"))


def peek_columns(path: str):
    if path.lower().endswith(".parquet"):
        import pyarrow.parquet as pq
        return pq.ParquetFile(path).schema_arrow.names
    return list(read_any(path).head(1).columns)


def split_of(path: str) -> str:
    n = os.path.basename(path).lower()
    return "test" if "test" in n else "val" if ("val" in n or "dev" in n) else "train"


def load_repo(dirpath: str, rng) -> dict[str, pd.DataFrame]:
    name = os.path.basename(dirpath).split("__")[-1].lower()
    files = [f for f in glob.glob(os.path.join(dirpath, "**", "*"), recursive=True)
             if f.lower().endswith((".parquet", ".csv", ".tsv", ".jsonl", ".json")) and "/.cache/" not in f.replace("\\", "/")]
    frames = []
    for f in files:
        try:
            cols = peek_columns(f)
            tc = next((c for c in TEXT_COLS if c in cols), None)
            lc = next((c for c in LABEL_COLS if c in cols), None)
            if not tc or not lc:
                continue
            gc = next((c for c in ("conversation_uid", "session_id", "conversation_id", "id") if c in cols), None)
            use = [c for c in (tc, lc, gc) if c]
            d = read_any(f, use if f.lower().endswith((".parquet", ".csv", ".tsv")) else None)
            d = d.rename(columns={tc: "raw", lc: "lab"})
            d["grp"] = d[gc].astype(str) if gc and gc in d else None
            d["split"] = split_of(f)
            d["cum"] = tc == "cumulative_text"
            frames.append(d[["raw", "lab", "grp", "split", "cum"]])
        except Exception as e:  # one odd file must not stop the run
            print(f"   skip {os.path.basename(f)}: {str(e)[:80]}")
    if not frames:
        return {}
    d = pd.concat(frames, ignore_index=True)
    d["label"] = d.lab.map(to_label)
    d = d[d.label.notna() & d.raw.notna()].copy()
    d["label"] = d.label.astype(int)
    d["raw"] = d.raw.astype(str)
    if d.empty:
        return {}
    is_call = bool(CALL_HINT.search(name)) or d.raw.str.contains("\n").mean() > 0.3 or d.raw.str.len().median() > 300
    if d.cum.any() and d.grp.notna().all():
        # ICFD-style rows: cumulative text of a call so far. Keep 3 late windows per call (50%, 75%, 100% of it).
        d["n"] = d.raw.str.len()
        d = d.sort_values(["grp", "n"])
        keep = []
        for _, g in d.groupby("grp", sort=False):
            idx = [min(len(g) - 1, int(round(q * (len(g) - 1)))) for q in (0.5, 0.75, 1.0)]
            keep.extend(g.index[sorted(set(idx))])
        d = d.loc[keep]
    d["text"] = d.raw.map(lambda x: clean(x[-400:]))
    d = d[d.text.str.len() > 5].drop_duplicates("text")
    if len(d) > MAX_ROWS:
        d = d.sample(MAX_ROWS, random_state=0)
    d["group"] = name + "-" + (d.grp.fillna(pd.Series(d.index.astype(str), index=d.index)).astype(str))
    out = {}
    if "icfd" in name:
        for sp, nm in (("test", "icfd_test"), ("train", "icfd_val"), ("val", "icfd_val")):
            part = d[d.split == sp]
            if len(part):
                out[nm] = pd.concat([out[nm], part]) if nm in out else part
    else:
        out[("hfcall_" if is_call else "hfsms_") + name[:30]] = d
    res = {}
    for k, v in out.items():
        src = "sms" if k.startswith("hfsms_") else k
        res[k] = pd.DataFrame(dict(text=v.text.values, label=v.label.values, group=v.group.values, source=src, weight=0.3 if src == "sms" else 1.0))
    return res


def load_hf_full(root: str) -> dict[str, pd.DataFrame]:
    rng = np.random.default_rng(0)
    parts: dict[str, pd.DataFrame] = {}
    for d in sorted(glob.glob(os.path.join(root, "*"))):
        if not os.path.isdir(d):
            continue
        got = load_repo(d, rng)
        for k, v in got.items():
            print(f"   {os.path.basename(d)} -> {k}: {len(v)} rows, {v.label.mean():.0%} scam")
            parts[k] = pd.concat([parts[k], v], ignore_index=True) if k in parts else v
    return parts
