#!/usr/bin/env python3
"""Copy C안 FO + html/shared into public/ for Vercel static deploy."""
import shutil
import pathlib

SHARED_SRC = pathlib.Path("html/shared")
DST = pathlib.Path("public")

# Paths not served to end users (Vercel project metadata, IA notes)
SKIP_NAMES = {".vercel", "vercel.json"}


def _resolve_fo_src() -> pathlib.Path:
    """C안/FO — use dynamic lookup for Linux deploy (Unicode path encoding)."""
    direct = pathlib.Path("html") / "C안" / "FO"
    if direct.is_dir():
        return direct
    html_dir = pathlib.Path("html")
    if not html_dir.is_dir():
        raise RuntimeError(f"html/ not found: {html_dir.resolve()}")
    for d in sorted(html_dir.iterdir()):
        if d.is_dir() and d.name.startswith("C"):
            fo = d / "FO"
            if fo.is_dir():
                return fo
    raise RuntimeError(
        f"FO source not found under html/. Found: {[p.name for p in html_dir.iterdir()]}"
    )


FO_SRC = _resolve_fo_src()

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
