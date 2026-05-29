#!/usr/bin/env python3
import shutil, os, pathlib

src = pathlib.Path("html/A안")
dst = pathlib.Path("public")

if dst.exists():
    shutil.rmtree(dst)

shutil.copytree(src, dst)
print(f"Copied {src} → {dst}")
