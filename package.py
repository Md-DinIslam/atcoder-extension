#!/usr/bin/env python3
"""
Packaging script for Chrome Web Store release.
Creates a clean, production-ready zip file without scratch files or git history.
"""

import os
import zipfile
import json

def package_extension():
    out_zip = "atcoder-pulse-extension.zip"
    if os.path.exists(out_zip):
        os.remove(out_zip)

    # Read manifest to confirm version
    with open("manifest.json", "r") as f:
        manifest = json.load(f)

    version = manifest.get("version", "1.0.0")
    print(f"📦 Packaging AtCoder Pulse v{version}...")

    include_dirs = ["icons", "popup", "content", "background", "utils"]
    include_files = ["manifest.json"]

    total_files = 0
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add root manifest
        for f in include_files:
            if os.path.exists(f):
                zf.write(f, f)
                total_files += 1
                print(f"  + {f}")

        # Add directories
        for d in include_dirs:
            for root, _, files in os.walk(d):
                for file in files:
                    # Ignore swap or hidden files
                    if file.startswith(".") or file.endswith("~"):
                        continue
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, ".")
                    zf.write(full_path, rel_path)
                    total_files += 1
                    print(f"  + {rel_path}")

    size_kb = os.path.getsize(out_zip) / 1024
    print(f"\n✅ Created: {out_zip} ({total_files} files, {size_kb:.1f} KB)")
    print("🚀 Ready to upload to Google Chrome Web Store Developer Dashboard!")

if __name__ == "__main__":
    package_extension()

