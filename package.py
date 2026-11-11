#!/usr/bin/env python3
"""
Packaging script for Chrome and Firefox releases.
Builds two separate, browser-compliant distribution packages:
1. atcoder-pulse-chrome.zip  (For Chrome, Brave, Edge, Opera, Vivaldi)
2. atcoder-pulse-firefox.zip (For Mozilla Firefox & AMO Developer Hub)
"""

import os
import zipfile
import json

def package_browser(target_name, manifest_source):
    if os.path.exists(target_name):
        os.remove(target_name)

    include_dirs = ["icons", "popup", "content", "background", "utils"]
    total_files = 0

    with zipfile.ZipFile(target_name, "w", zipfile.ZIP_DEFLATED) as zf:
        # Write browser-specific manifest as manifest.json inside the zip
        zf.write(manifest_source, "manifest.json")
        total_files += 1

        # Add directories
        for d in include_dirs:
            for root, _, files in os.walk(d):
                for file in files:
                    if file.startswith(".") or file.endswith("~"):
                        continue
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, ".")
                    zf.write(full_path, rel_path)
                    total_files += 1

    size_kb = os.path.getsize(target_name) / 1024
    print(f"  ✅ Created {target_name} ({total_files} files, {size_kb:.1f} KB)")

def main():
    with open("manifest.json", "r") as f:
        v = json.load(f).get("version", "1.0.0")

    print(f"📦 Packaging AtCoder Pulse v{v} (2 packages: Chrome & Firefox)...\n")

    # 1. Chrome / Chromium build
    print("🔹 Building Chromium package (Chrome, Brave, Edge, Opera):")
    package_browser("atcoder-pulse-chrome.zip", "manifest.json")

    # 2. Firefox build
    print("\n🦊 Building Firefox package (Mozilla Firefox & AMO):")
    package_browser("atcoder-pulse-firefox.zip", "manifest.firefox.json")

    print("\n🚀 Done! Exactly 2 production zip packages created.")

if __name__ == "__main__":
    main()
