#!/usr/bin/env python3
"""Copy C안 FO + html/shared into public/ for Vercel static deploy."""
import shutil
import pathlib

FO_SRC = pathlib.Path("html") / "C안" / "FO"
SHARED_SRC = pathlib.Path("html/shared")
DST = pathlib.Path("public")

# Paths not served to end users (Vercel project metadata, IA notes)
SKIP_NAMES = {".vercel", "vercel.json"}

if not FO_SRC.is_dir():
    raise RuntimeError(f"FO source not found: {FO_SRC.resolve()}")

if DST.exists():
    shutil.rmtree(DST)

def ignore(_dir: str, names: list[str]) -> set[str]:
    return {n for n in names if n in SKIP_NAMES}

shutil.copytree(FO_SRC, DST, ignore=ignore)

if SHARED_SRC.is_dir():
    dst_shared = DST / "shared"
    if dst_shared.exists():
        shutil.rmtree(dst_shared)
    shutil.copytree(SHARED_SRC, dst_shared)
    print(f"Copied {SHARED_SRC} → {dst_shared}")

# FO source uses ../../shared/ for repo-tree preview; public/ is flat.
for html in DST.glob("*.html"):
    text = html.read_text(encoding="utf-8")
    patched = text.replace("../../shared/", "shared/")
    if patched != text:
        html.write_text(patched, encoding="utf-8")

print(f"Copied {FO_SRC} → {DST}")
