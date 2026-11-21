#!/usr/bin/env python3
"""Train + honestly test the on-device scam model on EVERY call dataset we have, leaving one source out each time.

  python training/train_multi.py                # writes src/model/model.json if the gate passes, report to training/report_multi.json

Sources (all local files; see datasets/README.md):
  icfd_val / icfd_test  ICFD-31k sample (Indian English/Hinglish calls)   <- datasets/icfd_full_sample.parquet
  kaggle                Scam / non-scam call scripts (English)             <- datasets/kaggle__*.jsonl
  handwritten           our Hindi / Punjabi / Hinglish call scripts        <- datasets/voiceguard-handwritten-calls.jsonl
  robocall              NCSU robocall transcripts (scam only)              <- datasets/robocall/metadata.csv
  sms                   UCI SMS + Hindi / Punjabi / Hinglish SMS (optional, low weight)

For each held-out call source S the model is trained on the OTHER sources only, the alert pivot is calibrated on
out-of-fold benign windows of those other sources, and recall / false alarms are measured on S.
"""
import argparse, glob, json, os, re, sys, tempfile
import numpy as np, pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold

sys.path.insert(0, os.path.dirname(__file__))
import data as D
from train import fit, proba, export

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DS = os.path.join(ROOT, "datasets")
clean = D.clean


def jl(path):
    return [json.loads(l) for l in open(path, encoding="utf-8") if l.strip()]


def load_all(icfd_parquet):
    parts = {}
    ic = pd.read_parquet(icfd_parquet)
    v = ic.final_verdict.astype(str).str.strip().str.lower()
    ic = ic[v.str.match(r"^(y|n)")].copy()
    ic["label"] = v[ic.index].str.startswith("y").astype(int)
    for sp, name in (("validation", "icfd_val"), ("test", "icfd_test")):
        d = ic[ic._split == sp]
        parts[name] = pd.DataFrame(dict(text=d.cumulative_text.map(lambda x: clean(str(x)[-400:])), label=d.label.values,
                                        group=name + "-" + d.conversation_uid.astype(str).values, source=name, weight=1.0))
    k = glob.glob(os.path.join(DS, "kaggle__*.jsonl"))
    if k:
        r = pd.DataFrame(jl(k[0]))
        parts["kaggle"] = pd.DataFrame(dict(text=r.text.map(clean), label=r.label, group="kg-" + r.index.astype(str), source="kaggle", weight=1.0))
    hw = os.path.join(DS, "voiceguard-handwritten-calls.jsonl")
    if os.path.exists(hw):
        r = pd.DataFrame(jl(hw))
        parts["handwritten"] = pd.DataFrame(dict(text=r.text.map(clean), label=r.label, group="hw-" + r.index.astype(str), source="handwritten", weight=1.0))
    rb = os.path.join(DS, "robocall", "metadata.csv")
    if os.path.exists(rb):
        parts["robocall"] = D.load_robocalls(rb)
    sms = []
    p = os.path.join(DS, "sms", "sms.tsv")
    if os.path.exists(p):
        sms.append(D.load_sms(p))
    for f in glob.glob(os.path.join(DS, "gh__*.jsonl")):
        r = pd.DataFrame(jl(f))
        sms.append(pd.DataFrame(dict(text=r.text.map(clean), label=r.label, group="s-" + os.path.basename(f) + r.index.astype(str), source="sms", weight=0.3)))
    if sms:
        parts["sms"] = pd.concat(sms, ignore_index=True)
    return parts


def oof_pivot(train, C, q=0.98):
    """Pivot = level that only 2% of UNSEEN benign windows reach, from 3-fold out-of-fold predictions."""
    p = np.zeros(len(train))
    for tr, te in StratifiedGroupKFold(3, shuffle=True, random_state=0).split(train.text, train.label, train.group):
        v, c = fit(train.iloc[tr], C)
        p[te] = proba(v, c, train.text.iloc[te])
    ben = p[(train.label == 0).values & (train.source != "sms").values]
    return float(min(0.95, max(0.3, np.quantile(ben, q)))) if len(ben) else 0.8


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--icfd", default=os.path.join(DS, "icfd_full_sample.parquet"))
    ap.add_argument("--C", type=float, default=3.0)
    ap.add_argument("--folds-out", default=os.path.join(tempfile.gettempdir(), "vg_models"))
    ap.add_argument("--hf-dir", default=None, help="folder made by scripts/download_hf_full.py (whole Hugging Face datasets)")
    ap.add_argument("--no-ship", action="store_true")
    ap.add_argument("--pivot", type=float, default=0.85)
    a = ap.parse_args()
    parts = load_all(a.icfd)
    if a.hf_dir and os.path.isdir(a.hf_dir):
        from hf_full import load_hf_full
        print("Loading whole Hugging Face datasets from", a.hf_dir)
        hf = load_hf_full(a.hf_dir)
        if "icfd_test" in hf:  # the full ICFD replaces the 3,000-row sample (it contains it)
            parts.pop("icfd_val", None); parts.pop("icfd_test", None)
        parts.update({k: v for k, v in hf.items() if len(v)})
    for k, v in parts.items():
        print(f"  {k:12} {len(v):5} rows, {v.label.mean():.0%} scam")
    os.makedirs(a.folds_out, exist_ok=True)
    for k in ("icfd_test", "kaggle", "handwritten"):
        if k in parts:
            with open(os.path.join(a.folds_out, k + ".jsonl"), "w", encoding="utf-8") as f:
                for t, l in zip(parts[k].text, parts[k].label):
                    f.write(json.dumps(dict(text=t, label=int(l)), ensure_ascii=False) + "\n")
    held = [k for k in ("icfd_test", "kaggle", "handwritten") if k in parts]
    report = {}
    for use_sms in (True, False):
        print(f"\n=== {'with' if use_sms else 'without'} SMS data in training ===")
        for h in held:
            tr = pd.concat([v for k, v in parts.items() if k != h and (use_sms or k != "sms") and not (h == "icfd_test" and k == "icfd_test")], ignore_index=True)
            te = parts[h]
            vec, clf = fit(tr, a.C)
            p = proba(vec, clf, te.text)
            pivot = oof_pivot(tr, a.C)
            auc = roc_auc_score(te.label, p) if te.label.nunique() > 1 else float("nan")
            rec = float((p[te.label.values == 1] >= pivot).mean())
            fa = float((p[te.label.values == 0] >= pivot).mean())
            print(f"  held-out {h:12} AUC {auc:5.3f}  pivot {pivot:.2f}  scams caught {rec:5.1%}  false alarms {fa:5.1%}  (n={len(te)})")
            report[f"{'sms' if use_sms else 'nosms'}|{h}"] = dict(auc=auc, pivot=pivot, recall=rec, false_alarm=fa, n=int(len(te)))
            tag = ("sms_" if use_sms else "nosms_") + h
            export(vec, clf, os.path.join(a.folds_out, tag + ".json"), dict(trained_on={k: int(len(v)) for k, v in parts.items()}, C=a.C, window_turns=D.WINDOW_TURNS, pivot=round(pivot, 3), stub=False, reliable=True, heldout=h))
    json.dump(report, open(os.path.join(ROOT, "training", "report_multi.json"), "w"), indent=1)
    print("\nfold models written to", a.folds_out)

    # ---- ship: final model on ALL sources. Gate = clearly better than chance on every held-out call source.
    aucs = [report[f"sms|{h}"]["auc"] for h in held]
    gate = bool(min(aucs) >= 0.75)
    print(f"\nGate (held-out AUC >= 0.75 on every source): {'PASSED' if gate else 'FAILED'}  {[round(x, 3) for x in aucs]}")
    if a.no_ship:
        return
    out = os.path.join(ROOT, "src", "model", "model.json")
    full = pd.concat(list(parts.values()), ignore_index=True)
    vec, clf = fit(full, a.C)
    if gate:
        # Pivot 0.85 was chosen from scripts/eval-model.ts on the held-out folds: it gave the best balance of scams
        # caught vs false alarms across the three unseen sources (see training/README.md).
        export(vec, clf, out, dict(trained_on={k: int(len(v)) for k, v in parts.items()}, C=a.C, window_turns=D.WINDOW_TURNS, pivot=a.pivot,
                                   stub=False, reliable=True, heldout_auc={h: round(report[f"sms|{h}"]["auc"], 3) for h in held},
                                   note="held-out AUC >= 0.75 on every unseen call source"))
        sample = full.sample(40, random_state=1).text.tolist() + ["tell me the otp right now or you will be arrested", "hello beta ghar aa gaya hoon darwaza khol do"]
        json.dump([dict(text=t, p=round(float(q), 6)) for t, q in zip(sample, proba(vec, clf, sample))], open(os.path.join(ROOT, "training", "parity.json"), "w", encoding="utf-8"), ensure_ascii=False)
        print("model shipped ->", out)
    else:
        print("gate failed: the existing src/model/model.json was NOT changed")


if __name__ == "__main__":
    main()
