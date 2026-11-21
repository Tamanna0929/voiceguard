"""Cross-platform dataset downloader (Windows / macOS / Linux, needs only Python 3 and internet).
Downloads the datasets that live on GitHub. The Hugging Face ones are fetched by `python training/train.py --hf`.
"""
import io, os, shutil, sys, urllib.request, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get(url: str) -> bytes:
    print("  downloading", url)
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "voiceguard"}), timeout=120) as r:
        return r.read()


def main():
    os.makedirs(os.path.join(ROOT, "datasets", "sms"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "datasets", "robocall"), exist_ok=True)

    print("[1/3] UCI SMS Spam Collection (GitHub mirror)")
    open(os.path.join(ROOT, "datasets/sms/sms.tsv"), "wb").write(
        get("https://raw.githubusercontent.com/justmarkham/pycon-2016-tutorial/master/data/sms.tsv"))

    print("[2/3] NCSU robocall transcripts (real FTC-flagged robocalls)")
    open(os.path.join(ROOT, "datasets/robocall/metadata.csv"), "wb").write(
        get("https://raw.githubusercontent.com/wspr-ncsu/robocall-audio-dataset/main/metadata.csv"))

    print("[3/3] ICFD-31k sample conversations (research-use licence)")
    z = zipfile.ZipFile(io.BytesIO(get("https://github.com/SPELLAILab/ICFD-31k/archive/refs/heads/main.zip")))
    dest = os.path.join(ROOT, "datasets", "icfd")
    shutil.rmtree(dest, ignore_errors=True)
    n = 0
    for name in z.namelist():
        parts = name.split("/", 1)
        if len(parts) == 2 and parts[1].startswith("examples/") and not name.endswith("/"):
            out = os.path.join(dest, *parts[1].split("/"))
            os.makedirs(os.path.dirname(out), exist_ok=True)
            open(out, "wb").write(z.read(name))
            n += 1
    print(f"  extracted {n} ICFD example files")
    print("\nDone. Next:  python training/train.py --hf")


if __name__ == "__main__":
    sys.exit(main())
