#!/usr/bin/env python3
import shutil, os, pathlib

# Find the A안 directory dynamically (handles encoding issues)
html_dir = pathlib.Path("html")
src = None
for d in html_dir.iterdir():
    if d.is_dir() and d.name.startswith("A"):
        src = d
        break

if src is None:
    raise RuntimeError(f"Could not find A안 directory in html/. Found: {list(html_dir.iterdir())}")

dst = pathlib.Path("public")
if dst.exists():
    shutil.rmtree(dst)

shutil.copytree(src, dst)
shared = pathlib.Path("html/shared")
if shared.is_dir():
    dst_shared = dst / "shared"
    if dst_shared.exists():
        shutil.rmtree(dst_shared)
    shutil.copytree(shared, dst_shared)
    print(f"Copied {shared} → {dst_shared}")
print(f"Copied {src} → {dst}")
