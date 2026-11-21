#!/usr/bin/env python3
"""Train the VoiceGuard on-device scam classifier and export it for the app.

  python training/train.py                       # data reachable offline (ICFD sample, robocalls, SMS)
  python training/train.py --hf                  # + Hindi/Hinglish/Punjabi + full ICFD-31k from Hugging Face

Model: TF-IDF over character n-grams (2-5, word-bounded, so it copes with Hinglish spelling and speech-to-text
noise) + logistic regression. It exports to a JSON the app evaluates in plain TypeScript, so there is no native
ML runtime and it runs offline in microseconds.
"""
import argparse, json, os, sys, time

os.environ.setdefault("PYTHONUNBUFFERED", "1")
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")          # the Xet downloader can stall silently on some networks
os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "60")
os.environ.setdefault("HF_HUB_ETAG_TIMEOUT", "30")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "0")
_T0 = time.time()


def log(msg):
    print(f"[{time.time() - _T0:6.0f}s] {msg}", flush=True)


log("starting - loading libraries (first run can take a minute)")

for _s in (sys.stdout, sys.stderr):  # Windows consoles default to cp1252 and choke on Hindi n-grams
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold

sys.path.insert(0, os.path.dirname(__file__))
import data as D
log("libraries loaded")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NGRAM = (2, 5)
MAX_FEATURES = 30000


def fit(df: pd.DataFrame, C: float):
    vec = TfidfVectorizer(analyzer="char_wb", ngram_range=NGRAM, min_df=2, max_features=MAX_FEATURES, sublinear_tf=True, lowercase=True, dtype=np.float32)
    X = vec.fit_transform(df.text)
    clf = LogisticRegression(C=C, class_weight="balanced", max_iter=3000)
    clf.fit(X, df.label, sample_weight=df.weight)
    return vec, clf


def proba(vec, clf, texts):
    return clf.predict_proba(vec.transform(texts))[:, 1]


def export(vec, clf, path, meta):
    vocab = vec.vocabulary_
    idf = vec.idf_
    coef = clf.coef_[0]
    feats = {g: [round(float(idf[i]), 3), round(float(coef[i]), 4)] for g, i in vocab.items()}
    json.dump(dict(meta=meta, ngram=list(NGRAM), bias=round(float(clf.intercept_[0]), 4), features=feats), open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"exported {len(feats)} features -> {path} ({os.path.getsize(path)/1024:.0f} KB)")


def cv_icfd(icfd: pd.DataFrame, extra: pd.DataFrame, C: float, folds=5, seed=0, thr=0.7, dump_dir=None):
    """Grouped CV on ICFD conversations: windows of one call never sit in both train and test."""
    conv = icfd.groupby("group").conv_label.max()
    skf = StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=seed)
    gids = conv.index.to_numpy()
    fold_of = {}
    preds = pd.Series(index=icfd.index, dtype=float)
    for k, (tr, te) in enumerate(skf.split(gids, conv.values, gids)):
        trg, teg = set(gids[tr]), set(gids[te])
        train = pd.concat([icfd[icfd.group.isin(trg)], extra], ignore_index=True)
        vec, clf = fit(train, C)
        m = icfd.group.isin(teg)
        preds[m] = proba(vec, clf, icfd.text[m])
        for g in teg:
            fold_of[g] = k
        if dump_dir:
            export(vec, clf, os.path.join(dump_dir, f"fold{k}.json"), dict(fold=k))
    icfd = icfd.assign(p=preds)
    auc = roc_auc_score(icfd.label, icfd.p) if icfd.label.nunique() > 1 else float("nan")
    tp = fn = fp = tn = 0
    first = []
    for g, d in icfd.groupby("group"):
        flagged = (d.p >= thr).any()
        fraud = d.conv_label.iloc[0] == 1
        if fraud and flagged:
            tp += 1
            first.append(float(d.loc[d.p >= thr, "t"].min()))
        elif fraud:
            fn += 1
        elif flagged:
            fp += 1
        else:
            tn += 1
    return dict(auc=auc, tp=tp, fn=fn, fp=fp, tn=tn, med_t=float(np.median(first)) if first else float("nan")), fold_of, icfd


def eval_full_icfd(full: pd.DataFrame, extra: pd.DataFrame, C: float):
    """Protocol for the real ICFD-31k: train on its train split (+ Indic/SMS extras), calibrate the pivot on its
    validation split, report on test and on the unseen-fraud-type cross_domain split."""
    sp = full.split.astype(str).str.lower()
    tr, va = full[sp.str.startswith("train")], full[sp.str.startswith("val")]
    vec, clf = fit(pd.concat([tr, extra], ignore_index=True), C)
    out = {}
    pivot = 0.8
    if len(va):
        pv = proba(vec, clf, va.text)
        pivot = float(min(0.95, max(0.5, np.quantile(pv[va.label.values == 0], 0.98))))
    for name in ("test", "cross"):
        d = full[sp.str.startswith(name)]
        if not len(d):
            continue
        p = proba(vec, clf, d.text)
        out[name] = dict(n=int(len(d)), auc=float(roc_auc_score(d.label, p)) if d.label.nunique() > 1 else None,
                         recall=float((p[d.label.values == 1] >= pivot).mean()) if (d.label == 1).any() else None,
                         false_alarm=float((p[d.label.values == 0] >= pivot).mean()) if (d.label == 0).any() else None)
        print(f"  ICFD-31k {name}: {out[name]}")
    return out, pivot


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--icfd", default=os.path.join(ROOT, "datasets/icfd/examples/source_conversations"))
    ap.add_argument("--robocall", default=os.path.join(ROOT, "datasets/robocall/metadata.csv"))
    ap.add_argument("--sms", default=os.path.join(ROOT, "datasets/sms/sms.tsv"))
    ap.add_argument("--hf", action="store_true", help="also load Hugging Face datasets (needs internet access to huggingface.co)")
    ap.add_argument("--out", default=os.path.join(ROOT, "src/model/model.json"))
    ap.add_argument("--report", default=os.path.join(ROOT, "training/report.json"))
    ap.add_argument("--dump-folds", default=None, help="write per-fold models + fold map here (used by scripts/evaluate.ts)")
    ap.add_argument("--C", type=float, default=None)
    a = ap.parse_args()

    if a.hf:
        missing = []
        for m in ("datasets", "huggingface_hub", "pyarrow"):
            try:
                __import__(m)
            except Exception:
                missing.append(m)
        if missing:
            sys.exit(
                "--hf needs these packages, which are not installed: " + ", ".join(missing) + "\n"
                "pyarrow has no build for Python 3.14 yet. Use Python 3.12 or 3.13:\n"
                "  winget install -e --id Python.Python.3.12      (then open a NEW terminal)\n"
                "  py -3.12 -m pip install -r training\\requirements.txt\n"
                "  py -3.12 training\\train.py --hf"
            )

    log("reading local ICFD sample")
    icfd = D.load_icfd_local(a.icfd)
    if icfd.empty:
        sys.exit(f"No ICFD sample found at {a.icfd}\nRun first:  python scripts/fetch_datasets.py   (from the project folder)")
    print(f"ICFD windows: {len(icfd)} from {icfd.group.nunique()} calls ({icfd.groupby('group').conv_label.max().sum()} fraud)")
    parts = {}
    if os.path.exists(a.robocall):
        parts["robocall"] = D.load_robocalls(a.robocall)
    if os.path.exists(a.sms):
        parts["sms"] = D.load_sms(a.sms)
    if a.hf:
        log("downloading Hugging Face datasets - each one prints a line when done; big ones can take several minutes")
        for df in D.load_hf_all():
            parts[df.source.iloc[0]] = df
    for k, v in parts.items():
        print(f"  extra[{k}]: {len(v)} rows, {v.label.mean():.0%} scam")

    report = {}
    full_icfd = parts.pop("icfd_full", None)
    # ---- ablation: does outside data help on UNSEEN ICFD calls?
    configs = {"icfd_only": []} | {f"icfd+{k}": [k] for k in parts} | {"icfd+all": list(parts)}
    best, bestC = None, a.C or 1.0
    Cs = [a.C] if a.C else [0.3, 1, 3, 10]
    print("\nGrouped 5-fold CV on unseen ICFD calls (threshold 0.7):")
    print(f"{'config':26} {'C':>4} {'AUC':>6} {'fraud caught':>13} {'false alarms':>13} {'med s':>6}")
    for name, ks in configs.items():
        extra = pd.concat([parts[k] for k in ks], ignore_index=True) if ks else icfd.iloc[0:0]
        for C in Cs:
            r, _, _ = cv_icfd(icfd, extra, C)
            report[f"{name}|C={C}"] = r
            print(f"{name:26} {C:>4} {r['auc']:6.3f} {r['tp']:>5}/{r['tp']+r['fn']:<7} {r['fp']:>5}/{r['fp']+r['tn']:<7} {r['med_t']:6.0f}")
            if name == "icfd+all" and (best is None or r["auc"] > best):
                best, bestC = r["auc"], C
    C = a.C or bestC

    # ---- SMS sanity: 5-fold on SMS alone
    if "sms" in parts:
        from sklearn.model_selection import StratifiedKFold
        sms = parts["sms"]
        aucs = []
        for tr, te in StratifiedKFold(5, shuffle=True, random_state=0).split(sms.text, sms.label):
            v, c = fit(sms.iloc[tr], C)
            aucs.append(roc_auc_score(sms.label.iloc[te], proba(v, c, sms.text.iloc[te])))
        report["sms_cv_auc"] = float(np.mean(aucs))
        print(f"\nSMS spam/ham 5-fold AUC (sanity): {np.mean(aucs):.3f}")

    if a.dump_folds:
        os.makedirs(a.dump_folds, exist_ok=True)
        extra = pd.concat(list(parts.values()), ignore_index=True)
        _, fold_of, _ = cv_icfd(icfd, extra, C, dump_dir=a.dump_folds)
        json.dump(fold_of, open(os.path.join(a.dump_folds, "folds.json"), "w"))

    # ---- calibrate the alert pivot from OUT-OF-FOLD predictions on benign calls: the app only counts
    #      model probability above the level that <=2% of unseen genuine windows reach.
    extra_all = pd.concat(list(parts.values()), ignore_index=True) if parts else icfd.iloc[0:0]
    _, _, oof = cv_icfd(icfd, extra_all, C)
    benign = oof[oof.conv_label == 0].p
    pivot = float(min(0.95, max(0.5, np.quantile(benign, 0.98)))) if len(benign) else 0.8
    print(f"calibrated pivot (98th percentile of unseen benign windows): {pivot:.3f}")

    if full_icfd is not None:
        print("\nFull ICFD-31k protocol (its own train / validation / test / cross_domain splits):")
        extra_nf = pd.concat(list(parts.values()), ignore_index=True) if parts else icfd.iloc[0:0]
        res, pivot = eval_full_icfd(full_icfd, extra_nf, C)
        report["icfd_full"] = res
        parts["icfd_full"] = full_icfd[~full_icfd.split.astype(str).str.lower().str.startswith(("test", "cross"))]

    # ---- final model on everything available
    full = pd.concat([icfd] + list(parts.values()), ignore_index=True)
    vec, clf = fit(full, C)
    # Reliability gate: the model is only switched on in the app if it beats chance by a clear margin on the
    # held-out ICFD-31k test split. Otherwise a disabled stub is exported and the rule engine runs alone.
    t = (report.get("icfd_full") or {}).get("test") or {}
    auc, rec, fa = t.get("auc"), t.get("recall"), t.get("false_alarm")
    reliable = bool(auc is not None and rec is not None and fa is not None and auc >= 0.75 and (rec - fa) >= 0.30)
    report["gate"] = dict(test_auc=auc, recall=rec, false_alarm=fa, passed=reliable)
    meta = dict(trained_on={k: int(len(v)) for k, v in parts.items()} | {"icfd": int(len(icfd))}, C=C, window_turns=D.WINDOW_TURNS, pivot=round(pivot, 3),
                stub=not reliable, reliable=reliable, note="enabled only if held-out ICFD-31k test AUC >= 0.75 and recall - false_alarm >= 0.30")
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    if reliable:
        export(vec, clf, a.out, meta)
        print("\nGATE PASSED: model exported and will be ON in the app.")
    else:
        stub = dict(meta=dict(stub=True, reliable=False, note=f"Model failed the held-out test (AUC={auc}, recall={rec}, false_alarm={fa}); rules only."), ngram=[2, 5], bias=0, features={})
        json.dump(stub, open(a.out, "w", encoding="utf-8"))
        print(f"\nGATE FAILED (test AUC={auc}, recall={rec}, false alarm={fa}). Exported a DISABLED stub so the app runs on the rule engine alone.")
    sample = full.sample(40, random_state=1).text.tolist() + ["tell me the otp right now or you will be arrested", "hello beta ghar aa gaya hoon darwaza khol do"]
    json.dump([dict(text=t, p=round(float(p), 6)) for t, p in zip(sample, proba(vec, clf, sample))], open(os.path.join(ROOT, "training/parity.json"), "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(report, open(a.report, "w", encoding="utf-8"), indent=1)

    names = np.array(vec.get_feature_names_out())
    order = np.argsort(clf.coef_[0])
    print("\nTop scam-leaning n-grams:", [n.strip() for n in names[order[-25:][::-1]]])
    print("Top benign-leaning n-grams:", [n.strip() for n in names[order[:15]]])


if __name__ == "__main__":
    main()
